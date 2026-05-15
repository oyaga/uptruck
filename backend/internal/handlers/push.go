package handlers

import (
	"encoding/json"
	"net/http"

	mw "freteantt/internal/middleware"
	"freteantt/internal/models"
	"freteantt/internal/push"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PushHandler struct {
	DB      *gorm.DB
	Manager *push.Manager
}

// PublicKey devolve a chave pública VAPID — frontend precisa pra chamar
// pushManager.subscribe() com applicationServerKey.
func (h *PushHandler) PublicKey(w http.ResponseWriter, r *http.Request) {
	if h.Manager == nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "push indisponível"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"public_key": h.Manager.PublicKey})
}

type pushKeys struct {
	P256dh string `json:"p256dh"`
	Auth   string `json:"auth"`
}

type subscribeReq struct {
	Endpoint  string   `json:"endpoint"`
	Keys      pushKeys `json:"keys"`
	UserAgent string   `json:"user_agent,omitempty"`
}

// Subscribe registra um endpoint Web Push pro usuário logado. Idempotente:
// se o endpoint já existe, atualiza o user_id (caso o dispositivo tenha
// trocado de conta) e as keys (caso tenham rotacionado).
func (h *PushHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}

	var body subscribeReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	if body.Endpoint == "" || body.Keys.P256dh == "" || body.Keys.Auth == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "subscription incompleta"})
		return
	}

	sub := models.PushSubscription{
		UserID:   user.ID,
		Endpoint: body.Endpoint,
		P256dh:   body.Keys.P256dh,
		Auth:     body.Keys.Auth,
	}
	if body.UserAgent != "" {
		sub.UserAgent = &body.UserAgent
	}

	// Upsert pelo endpoint (UNIQUE) — atualiza user_id e keys se já existir
	err := h.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "endpoint"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"user_id", "p256dh", "auth", "user_agent",
		}),
	}).Create(&sub).Error
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao registrar"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Unsubscribe remove um endpoint específico (chamado no logout / desinscrição).
func (h *PushHandler) Unsubscribe(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var body subscribeReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	if body.Endpoint == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "endpoint obrigatório"})
		return
	}
	h.DB.Where("user_id = ? AND endpoint = ?", user.ID, body.Endpoint).
		Delete(&models.PushSubscription{})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
