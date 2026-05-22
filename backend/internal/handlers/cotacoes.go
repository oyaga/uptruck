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

// Status do fluxo de uma cotação.
const (
	statusEmAnalise       = "Em Análise"            // Laura criou; aguarda o admin
	statusRespondida      = "Respondida"            // admin respondeu; aguarda Laura
	statusEnviadaCliente  = "Enviada ao Cliente"    // Laura repassou; aguarda o cliente
	statusAprovadaCliente = "Aprovada pelo Cliente" // cliente aceitou; aguarda contrato
	statusAprovacaoComl   = "Em Aprovação Comercial" // contrato em aprovação comercial
	statusFechada         = "Fechada"               // concluída
	statusRecusada        = "Recusada"              // recusada (terminal)
)

// cotadorTransicoes mapeia a ação do cotador para [statusAtualExigido, próximoStatus].
var cotadorTransicoes = map[string][2]string{
	"enviar_cliente":    {statusRespondida, statusEnviadaCliente},
	"cliente_aprovou":   {statusEnviadaCliente, statusAprovadaCliente},
	"cliente_recusou":   {statusEnviadaCliente, statusRecusada},
	"enviar_comercial":  {statusAprovadaCliente, statusAprovacaoComl},
	"fechar":            {statusAprovacaoComl, statusFechada},
	"recusar_comercial": {statusAprovacaoComl, statusRecusada},
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
	EmpresaOriID  *uint   `json:"empresa_ori_id"`
	EmpresaDesID  *uint   `json:"empresa_des_id"`
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
		Status:        statusEmAnalise,
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
	c.EmpresaOriID = h.validEmpresaID(body.EmpresaOriID)
	c.EmpresaDesID = h.validEmpresaID(body.EmpresaDesID)

	if err := h.DB.Create(&c).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao criar cotação"})
		return
	}

	// Notifica todos os admins (best-effort — falha aqui não derruba o request)
	go h.notifyAdmins("cotacao_nova", "Nova cotação em análise",
		fmt.Sprintf("%s/%s → %s/%s · %s · piso ANTT %s",
			c.UfOri, c.CidadeOri, c.UfDes, c.CidadeDes, c.Veiculo, brl(c.AnttMin)),
		c.ID)

	writeJSON(w, http.StatusCreated, c)
}

func (h *CotacaoHandler) ListMine(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var list []models.Cotacao
	if err := h.DB.Preload("EmpresaOri").Preload("EmpresaDes").
		Where("created_by = ?", user.ID).Order("created_at DESC").Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar cotações"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// validEmpresaID devolve o id apenas se a empresa existir; caso contrário nil.
// Evita gravar um vínculo quebrado se o cliente mandar um id inválido.
func (h *CotacaoHandler) validEmpresaID(id *uint) *uint {
	if id == nil || *id == 0 {
		return nil
	}
	var n int64
	h.DB.Model(&models.Empresa{}).Where("id = ?", *id).Count(&n)
	if n == 0 {
		return nil
	}
	return id
}

func (h *CotacaoHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	var list []models.Cotacao
	q := h.DB.Preload("EmpresaOri").Preload("EmpresaDes").Order("created_at DESC")
	if s := r.URL.Query().Get("status"); s != "" {
		q = q.Where("status = ?", s)
	}
	if err := q.Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar cotações"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

type responderReq struct {
	Comment       string  `json:"comment"`
	ValorSugerido float64 `json:"valor_sugerido"`
}

// Responder — o admin corrige o valor e responde a cotação (Em Análise → Respondida).
func (h *CotacaoHandler) Responder(w http.ResponseWriter, r *http.Request) {
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
	var body responderReq
	_ = json.NewDecoder(r.Body).Decode(&body)

	var c models.Cotacao
	if err := h.DB.First(&c, id).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "cotação não encontrada"})
		return
	}
	if c.Status != statusEmAnalise {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "esta cotação não está mais em análise"})
		return
	}
	if body.ValorSugerido <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "informe o valor corrigido da cotação"})
		return
	}

	now := time.Now()
	c.Status = statusRespondida
	c.ValorSugerido = body.ValorSugerido
	c.AdminComment = strNil(body.Comment)
	c.ApprovedBy = ptrUint(user.ID)
	c.ApprovedAt = &now
	if err := h.DB.Save(&c).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar"})
		return
	}

	go h.notifyCotador(&c, "cotacao_respondida", "Cotação respondida ✅",
		fmt.Sprintf("%s/%s → %s/%s · valor %s — envie ao cliente%s",
			c.UfOri, c.CidadeOri, c.UfDes, c.CidadeDes, brl(c.ValorSugerido),
			commentSuffix(c.AdminComment)))

	writeJSON(w, http.StatusOK, c)
}

// Recusar — o admin recusa a cotação (Em Análise → Recusada).
func (h *CotacaoHandler) Recusar(w http.ResponseWriter, r *http.Request) {
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
	var body decisionReq
	_ = json.NewDecoder(r.Body).Decode(&body)

	var c models.Cotacao
	if err := h.DB.First(&c, id).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "cotação não encontrada"})
		return
	}
	if c.Status != statusEmAnalise {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "esta cotação não está mais em análise"})
		return
	}

	now := time.Now()
	c.Status = statusRecusada
	c.AdminComment = strNil(body.Comment)
	c.ApprovedBy = ptrUint(user.ID)
	c.ApprovedAt = &now
	if err := h.DB.Save(&c).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar"})
		return
	}

	go h.notifyCotador(&c, "cotacao_recusada", "Cotação recusada ❌",
		fmt.Sprintf("%s/%s → %s/%s%s",
			c.UfOri, c.CidadeOri, c.UfDes, c.CidadeDes, commentSuffix(c.AdminComment)))

	writeJSON(w, http.StatusOK, c)
}

type transicaoReq struct {
	Acao string `json:"acao"`
}

// Transicao — o cotador avança a cotação pelas etapas seguintes do fluxo.
func (h *CotacaoHandler) Transicao(w http.ResponseWriter, r *http.Request) {
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
	var body transicaoReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	t, valida := cotadorTransicoes[body.Acao]
	if !valida {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "ação inválida"})
		return
	}

	var c models.Cotacao
	if err := h.DB.First(&c, id).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "cotação não encontrada"})
		return
	}
	if c.CreatedBy == nil || *c.CreatedBy != user.ID {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "acesso negado"})
		return
	}
	if c.Status != t[0] {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "a cotação não está no status necessário para esta ação"})
		return
	}

	c.Status = t[1]
	if err := h.DB.Save(&c).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar"})
		return
	}

	go h.notifyAdmins("cotacao_atualizada", "Cotação atualizada",
		fmt.Sprintf("%s/%s → %s/%s · agora: %s",
			c.UfOri, c.CidadeOri, c.UfDes, c.CidadeDes, c.Status),
		c.ID)

	writeJSON(w, http.StatusOK, c)
}

// pushNotify grava a notificação e a entrega por SSE (UI aberta) e Web Push.
func (h *CotacaoHandler) pushNotify(userID uint, typ, title, msg string, cotacaoID uint, url string) {
	cid := cotacaoID
	n := models.Notificacao{UserID: userID, Type: typ, Title: title, Message: msg, CotacaoID: &cid}
	if err := h.DB.Create(&n).Error; err != nil {
		return
	}
	if h.Broker != nil {
		h.Broker.Publish(userID, notify.Event{Type: "notificacao", Data: n})
	}
	if h.Push != nil {
		h.Push.SendToUser(userID, push.Payload{
			Title: title, Message: msg, URL: url,
			Tag: fmt.Sprintf("cotacao-%d", cotacaoID),
		})
	}
}

// notifyAdmins notifica todos os administradores.
func (h *CotacaoHandler) notifyAdmins(typ, title, msg string, cotacaoID uint) {
	var admins []models.User
	if err := h.DB.Where("role = ?", "admin").Find(&admins).Error; err != nil {
		return
	}
	for _, u := range admins {
		h.pushNotify(u.ID, typ, title, msg, cotacaoID, "/admin")
	}
}

// notifyCotador notifica o autor da cotação.
func (h *CotacaoHandler) notifyCotador(c *models.Cotacao, typ, title, msg string) {
	if c.CreatedBy == nil {
		return
	}
	h.pushNotify(*c.CreatedBy, typ, title, msg, c.ID, "/cotacao")
}

func commentSuffix(comment *string) string {
	if comment != nil && strings.TrimSpace(*comment) != "" {
		return " · " + *comment
	}
	return ""
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
