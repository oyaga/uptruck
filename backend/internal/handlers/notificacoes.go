package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	mw "freteantt/internal/middleware"
	"freteantt/internal/models"
	"freteantt/internal/notify"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type NotificacaoHandler struct {
	DB     *gorm.DB
	Broker *notify.Broker
}

// List devolve as últimas notificações do usuário logado (default 30).
func (h *NotificacaoHandler) List(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	limit := 30
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	var list []models.Notificacao
	if err := h.DB.Where("user_id = ?", user.ID).
		Order("created_at DESC").Limit(limit).Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// UnreadCount devolve { unread: N }.
func (h *NotificacaoHandler) UnreadCount(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var n int64
	h.DB.Model(&models.Notificacao{}).
		Where("user_id = ? AND read_at IS NULL", user.ID).Count(&n)
	writeJSON(w, http.StatusOK, map[string]int64{"unread": n})
}

// MarkRead marca uma notificação como lida (apenas se pertence ao usuário).
func (h *NotificacaoHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	now := time.Now()
	res := h.DB.Model(&models.Notificacao{}).
		Where("id = ? AND user_id = ? AND read_at IS NULL", id, user.ID).
		Update("read_at", now)
	if res.Error != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao marcar"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "updated": res.RowsAffected})
}

// MarkAllRead marca todas as não-lidas do usuário como lidas.
func (h *NotificacaoHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	now := time.Now()
	res := h.DB.Model(&models.Notificacao{}).
		Where("user_id = ? AND read_at IS NULL", user.ID).
		Update("read_at", now)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "updated": res.RowsAffected})
}

// Stream abre uma conexão Server-Sent Events. O navegador (EventSource)
// reconecta automaticamente em caso de queda. Heartbeat a cada 15s mantém
// proxies/CDNs felizes (nginx etc.).
func (h *NotificacaoHandler) Stream(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		http.Error(w, "não autenticado", http.StatusUnauthorized)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming não suportado", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	ch, unsub := h.Broker.Subscribe(user.ID)
	defer unsub()

	// Hello inicial — frontend usa pra confirmar que o stream está ativo.
	fmt.Fprintf(w, "event: hello\ndata: {\"ok\":true}\n\n")
	flusher.Flush()

	ping := time.NewTicker(15 * time.Second)
	defer ping.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ping.C:
			fmt.Fprint(w, ": ping\n\n")
			flusher.Flush()
		case ev, open := <-ch:
			if !open {
				return
			}
			data, _ := json.Marshal(ev.Data)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", ev.Type, data)
			flusher.Flush()
		}
	}
}
