package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"freteantt/internal/antt"
	mw "freteantt/internal/middleware"
	"freteantt/internal/models"
	"freteantt/internal/notify"
	"freteantt/internal/push"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type CotacaoHandler struct {
	DB     *gorm.DB
	Broker *notify.Broker
	Push   *push.Manager
}

type createCotacaoReq struct {
	CepOri        string  `json:"cep_ori"`
	UfOri         string  `json:"uf_ori"`
	CidadeOri     string  `json:"cidade_ori"`
	BairroOri     string  `json:"bairro_ori"`
	CepDes        string  `json:"cep_des"`
	UfDes         string  `json:"uf_des"`
	CidadeDes     string  `json:"cidade_des"`
	BairroDes     string  `json:"bairro_des"`
	DistanciaKm   float64 `json:"distancia_km"`
	Produto       string  `json:"produto"`
	Embalagem     string  `json:"embalagem"`
	Unitizacao    string  `json:"unitizacao"`
	PesoKg        float64 `json:"peso_kg"`
	Volumes       int     `json:"volumes"`
	CubagemM3     float64 `json:"cubagem_m3"`
	ValorNf       float64 `json:"valor_nf"`
	Veiculo       string  `json:"veiculo"`
	Categoria     string  `json:"categoria"`
	ValorSugerido float64 `json:"valor_sugerido"`
}

type decisionReq struct {
	Comment string `json:"comment"`
}

func (h *CotacaoHandler) Create(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}

	var body createCotacaoReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	body.UfOri = strings.ToUpper(strings.TrimSpace(body.UfOri))
	body.UfDes = strings.ToUpper(strings.TrimSpace(body.UfDes))
	body.CidadeOri = strings.ToUpper(strings.TrimSpace(body.CidadeOri))
	body.CidadeDes = strings.ToUpper(strings.TrimSpace(body.CidadeDes))

	if body.UfOri == "" || body.CidadeOri == "" || body.UfDes == "" || body.CidadeDes == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "uf_ori, cidade_ori, uf_des e cidade_des são obrigatórios"})
		return
	}
	if body.DistanciaKm <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "distancia_km deve ser maior que 0"})
		return
	}
	if _, ok := antt.Veiculos[body.Veiculo]; !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "veículo inválido"})
		return
	}
	if _, ok := antt.Categorias[body.Categoria]; !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "categoria inválida"})
		return
	}

	min := antt.CalcMin(body.Veiculo, body.DistanciaKm, body.Categoria)
	// Valor sugerido pode ficar abaixo do piso ANTT — fica registrado em
	// antt_min e fica visível ao admin no card pra decisão informada.
	// (O alerta visual fica no frontend.)
	if body.ValorSugerido <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "valor_sugerido obrigatório"})
		return
	}

	c := models.Cotacao{
		Status:        "Aguardando",
		UfOri:         body.UfOri,
		CidadeOri:     body.CidadeOri,
		UfDes:         body.UfDes,
		CidadeDes:     body.CidadeDes,
		DistanciaKm:   body.DistanciaKm,
		Veiculo:       body.Veiculo,
		Categoria:     body.Categoria,
		AnttMin:       min,
		ValorSugerido: body.ValorSugerido,
		CreatedBy:     ptrUint(user.ID),
	}
	c.CepOri = strNil(body.CepOri)
	c.BairroOri = strNil(body.BairroOri)
	c.CepDes = strNil(body.CepDes)
	c.BairroDes = strNil(body.BairroDes)
	c.Produto = strNil(body.Produto)
	c.Embalagem = strNil(body.Embalagem)
	c.Unitizacao = strNil(body.Unitizacao)
	if body.PesoKg > 0 {
		c.PesoKg = &body.PesoKg
	}
	if body.Volumes > 0 {
		c.Volumes = &body.Volumes
	}
	if body.CubagemM3 > 0 {
		c.CubagemM3 = &body.CubagemM3
	}
	if body.ValorNf > 0 {
		c.ValorNf = &body.ValorNf
	}

	if err := h.DB.Create(&c).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao criar cotação"})
		return
	}

	// Notifica todos os admins (best-effort — falha aqui não derruba o request)
	go h.notifyAdminsOfPending(&c)

	writeJSON(w, http.StatusCreated, c)
}

func (h *CotacaoHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var list []models.Cotacao
	if err := h.DB.Where("created_by = ?", user.ID).Order("created_at DESC").Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar cotações"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *CotacaoHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	var list []models.Cotacao
	q := h.DB.Order("created_at DESC")
	if s := r.URL.Query().Get("status"); s != "" {
		q = q.Where("status = ?", s)
	}
	if err := q.Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar cotações"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *CotacaoHandler) Aprovar(w http.ResponseWriter, r *http.Request) {
	h.decide(w, r, "Aprovada")
}

func (h *CotacaoHandler) Reprovar(w http.ResponseWriter, r *http.Request) {
	h.decide(w, r, "Reprovada")
}

func (h *CotacaoHandler) decide(w http.ResponseWriter, r *http.Request, status string) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body decisionReq
	_ = json.NewDecoder(r.Body).Decode(&body)

	var c models.Cotacao
	if err := h.DB.First(&c, id).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "cotação não encontrada"})
		return
	}
	if c.Status != "Aguardando" {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "cotação já decidida"})
		return
	}
	now := time.Now()
	c.Status = status
	c.AdminComment = strNil(body.Comment)
	c.ApprovedBy = ptrUint(user.ID)
	c.ApprovedAt = &now
	if err := h.DB.Save(&c).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar"})
		return
	}

	// Notifica o cotador da decisão
	go h.notifyCotadorOfDecision(&c)

	writeJSON(w, http.StatusOK, c)
}

func (h *CotacaoHandler) notifyAdminsOfPending(c *models.Cotacao) {
	var admins []models.User
	if err := h.DB.Where("role = ?", "admin").Find(&admins).Error; err != nil {
		return
	}
	title := "Nova cotação aguardando aprovação"
	msg := fmt.Sprintf("%s/%s → %s/%s · %s · piso ANTT %s",
		c.UfOri, c.CidadeOri, c.UfDes, c.CidadeDes,
		c.Veiculo, brl(c.AnttMin))
	cid := c.ID
	for _, u := range admins {
		n := models.Notificacao{
			UserID: u.ID, Type: "cotacao_pendente",
			Title: title, Message: msg, CotacaoID: &cid,
		}
		if err := h.DB.Create(&n).Error; err != nil {
			continue
		}
		// SSE — entrega ao vivo na UI aberta
		if h.Broker != nil {
			h.Broker.Publish(u.ID, notify.Event{Type: "notificacao", Data: n})
		}
		// Web Push — entrega mesmo com app fechado
		if h.Push != nil {
			h.Push.SendToUser(u.ID, push.Payload{
				Title:   title,
				Message: msg,
				URL:     "/admin",
				Tag:     fmt.Sprintf("cotacao-%d", c.ID),
			})
		}
	}
}

func (h *CotacaoHandler) notifyCotadorOfDecision(c *models.Cotacao) {
	if c.CreatedBy == nil {
		return
	}
	var typ, title string
	if c.Status == "Aprovada" {
		typ, title = "cotacao_aprovada", "Cotação aprovada ✅"
	} else {
		typ, title = "cotacao_reprovada", "Cotação reprovada ❌"
	}
	msg := fmt.Sprintf("%s/%s → %s/%s · cotado %s",
		c.UfOri, c.CidadeOri, c.UfDes, c.CidadeDes, brl(c.ValorSugerido))
	if c.AdminComment != nil && *c.AdminComment != "" {
		msg += " · " + *c.AdminComment
	}
	cid := c.ID
	n := models.Notificacao{
		UserID: *c.CreatedBy, Type: typ,
		Title: title, Message: msg, CotacaoID: &cid,
	}
	if err := h.DB.Create(&n).Error; err != nil {
		return
	}
	if h.Broker != nil {
		h.Broker.Publish(*c.CreatedBy, notify.Event{Type: "notificacao", Data: n})
	}
	if h.Push != nil {
		h.Push.SendToUser(*c.CreatedBy, push.Payload{
			Title:   title,
			Message: msg,
			URL:     "/cotacao",
			Tag:     fmt.Sprintf("cotacao-%d", c.ID),
		})
	}
}

func brl(v float64) string {
	// formato simples — o frontend reformata em pt-BR pra exibição
	return fmt.Sprintf("R$ %.2f", v)
}

func ptrUint(v uint) *uint { return &v }

func strNil(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
