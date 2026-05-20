package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	mw "freteantt/internal/middleware"
	"freteantt/internal/models"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"
)

type EmpresaHandler struct {
	DB *gorm.DB
}

type empresaReq struct {
	CNPJ         string `json:"cnpj"`
	RazaoSocial  string `json:"razao_social"`
	NomeFantasia string `json:"nome_fantasia"`
	Cep          string `json:"cep"`
	Logradouro   string `json:"logradouro"`
	Numero       string `json:"numero"`
	Complemento  string `json:"complemento"`
	Bairro       string `json:"bairro"`
	Cidade       string `json:"cidade"`
	Uf           string `json:"uf"`
	Telefone     string `json:"telefone"`
	Email        string `json:"email"`
	Situacao     string `json:"situacao"`
}

// List devolve todas as empresas cadastradas (compartilhadas entre os
// cotadores). Aceita ?q= para busca por razão social, nome fantasia ou CNPJ.
func (h *EmpresaHandler) List(w http.ResponseWriter, r *http.Request) {
	var list []models.Empresa
	q := h.DB.Order("razao_social ASC")
	if s := strings.TrimSpace(r.URL.Query().Get("q")); s != "" {
		like := "%" + strings.ToLower(s) + "%"
		if digits := onlyDigits(s); digits != "" {
			q = q.Where(
				"LOWER(razao_social) LIKE ? OR LOWER(COALESCE(nome_fantasia,'')) LIKE ? OR cnpj LIKE ?",
				like, like, "%"+digits+"%")
		} else {
			q = q.Where(
				"LOWER(razao_social) LIKE ? OR LOWER(COALESCE(nome_fantasia,'')) LIKE ?",
				like, like)
		}
	}
	if err := q.Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar empresas"})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (h *EmpresaHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var e models.Empresa
	if err := h.DB.First(&e, id).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "empresa não encontrada"})
		return
	}
	writeJSON(w, http.StatusOK, e)
}

func (h *EmpresaHandler) Create(w http.ResponseWriter, r *http.Request) {
	user, _ := mw.FromContext(r.Context())

	var body empresaReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	e, msg := body.toModel()
	if msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}
	if user.ID > 0 {
		e.CreatedBy = ptrUint(user.ID)
	}

	var dup int64
	h.DB.Model(&models.Empresa{}).Where("cnpj = ?", e.CNPJ).Count(&dup)
	if dup > 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "já existe uma empresa com este CNPJ"})
		return
	}
	if err := h.DB.Create(&e).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar empresa"})
		return
	}
	writeJSON(w, http.StatusCreated, e)
}

func (h *EmpresaHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var existing models.Empresa
	if err := h.DB.First(&existing, id).Error; err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "empresa não encontrada"})
		return
	}

	var body empresaReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	updated, msg := body.toModel()
	if msg != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": msg})
		return
	}

	var dup int64
	h.DB.Model(&models.Empresa{}).Where("cnpj = ? AND id <> ?", updated.CNPJ, id).Count(&dup)
	if dup > 0 {
		writeJSON(w, http.StatusConflict, map[string]string{"error": "já existe outra empresa com este CNPJ"})
		return
	}

	updated.ID = existing.ID
	updated.CreatedBy = existing.CreatedBy
	updated.CreatedAt = existing.CreatedAt
	if err := h.DB.Save(&updated).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar empresa"})
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

// Delete remove a empresa. As cotações que a referenciam têm o vínculo
// zerado antes da exclusão — o endereço já fica copiado na própria cotação,
// então o histórico permanece íntegro.
func (h *EmpresaHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil || id <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	err = h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Cotacao{}).Where("empresa_ori_id = ?", id).
			Update("empresa_ori_id", nil).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.Cotacao{}).Where("empresa_des_id = ?", id).
			Update("empresa_des_id", nil).Error; err != nil {
			return err
		}
		res := tx.Delete(&models.Empresa{}, id)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "empresa não encontrada"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao excluir empresa"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// toModel valida e normaliza o payload. Em caso de erro de validação devolve
// uma mensagem não-vazia (a empresa retornada deve ser ignorada).
func (b empresaReq) toModel() (models.Empresa, string) {
	cnpj := onlyDigits(b.CNPJ)
	if !validCNPJ(cnpj) {
		return models.Empresa{}, "CNPJ inválido"
	}
	razao := strings.TrimSpace(b.RazaoSocial)
	if razao == "" {
		return models.Empresa{}, "razão social é obrigatória"
	}
	cidade := strings.ToUpper(strings.TrimSpace(b.Cidade))
	uf := strings.ToUpper(strings.TrimSpace(b.Uf))
	if cidade == "" || len(uf) != 2 {
		return models.Empresa{}, "cidade e UF são obrigatórias"
	}
	e := models.Empresa{
		CNPJ:        cnpj,
		RazaoSocial: razao,
		Cidade:      cidade,
		Uf:          uf,
	}
	e.NomeFantasia = strNil(b.NomeFantasia)
	e.Cep = strNil(b.Cep)
	e.Logradouro = strNil(b.Logradouro)
	e.Numero = strNil(b.Numero)
	e.Complemento = strNil(b.Complemento)
	e.Bairro = strNil(b.Bairro)
	e.Telefone = strNil(b.Telefone)
	e.Email = strNil(b.Email)
	e.Situacao = strNil(b.Situacao)
	return e, ""
}

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// validCNPJ confere os dois dígitos verificadores (módulo 11) do CNPJ.
func validCNPJ(cnpj string) bool {
	if len(cnpj) != 14 {
		return false
	}
	allSame := true
	for i := 1; i < 14; i++ {
		if cnpj[i] != cnpj[0] {
			allSame = false
			break
		}
	}
	if allSame {
		return false
	}
	calc := func(length int) int {
		w := []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
		if length == 13 {
			w = []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
		}
		sum := 0
		for i := 0; i < length; i++ {
			sum += int(cnpj[i]-'0') * w[i]
		}
		if r := sum % 11; r >= 2 {
			return 11 - r
		}
		return 0
	}
	return calc(12) == int(cnpj[12]-'0') && calc(13) == int(cnpj[13]-'0')
}
