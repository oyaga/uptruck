package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"freteantt/internal/auth"
	mw "freteantt/internal/middleware"
	"freteantt/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB *gorm.DB
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResp struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

const cookieName = "token"

// Navegadores limitam a vida de um cookie a ~400 dias, independente do que o
// servidor pedir. O cookie é renovado a cada GET /api/auth/me (no boot do
// app), então essa janela reinicia toda vez que o usuário abre o sistema —
// na prática a sessão não expira para quem usa o app periodicamente.
const cookieTTL = 400 * 24 * time.Hour

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body loginReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	if body.Email == "" || body.Password == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "email e senha são obrigatórios"})
		return
	}

	var u models.User
	if err := h.DB.Where("email = ?", body.Email).First(&u).Error; err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "credenciais inválidas"})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)); err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "credenciais inválidas"})
		return
	}

	tok, err := auth.Sign(u.ID, u.Role, u.Email)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao emitir token"})
		return
	}

	setAuthCookie(w, tok)

	writeJSON(w, http.StatusOK, loginResp{Token: tok, User: u})
}

// Me devolve o usuário autenticado a partir do cookie/JWT — usado pelo
// frontend pra revalidar a sessão no boot da app (especialmente em PWA,
// onde o localStorage pode estar vazio mas o cookie httpOnly continua válido).
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var u models.User
	if err := h.DB.First(&u, user.ID).Error; err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "usuário não encontrado"})
		return
	}
	// Renova a sessão: reemite o token e o cookie a cada boot do app, para
	// que a janela de validade reinicie sempre que o usuário abre o sistema.
	if tok, err := auth.Sign(u.ID, u.Role, u.Email); err == nil {
		setAuthCookie(w, tok)
	}
	writeJSON(w, http.StatusOK, u)
}

type updateProfileReq struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// UpdateProfile permite o usuário logado alterar o próprio nome, e-mail e
// senha. Alterações sensíveis (e-mail ou senha) exigem a senha atual.
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	ctxUser, ok := mw.FromContext(r.Context())
	if !ok {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var body updateProfileReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	var u models.User
	if err := h.DB.First(&u, ctxUser.ID).Error; err != nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "usuário não encontrado"})
		return
	}

	name := strings.TrimSpace(body.Name)
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "nome é obrigatório"})
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" || !strings.Contains(email, "@") {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "e-mail inválido"})
		return
	}

	emailChanged := email != u.Email
	wantsNewPassword := body.NewPassword != ""

	// E-mail e senha são sensíveis: confirmam com a senha atual.
	if emailChanged || wantsNewPassword {
		if body.CurrentPassword == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "informe a senha atual para confirmar a alteração"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.CurrentPassword)); err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "senha atual incorreta"})
			return
		}
	}

	if emailChanged {
		var count int64
		h.DB.Model(&models.User{}).Where("email = ? AND id <> ?", email, u.ID).Count(&count)
		if count > 0 {
			writeJSON(w, http.StatusConflict, map[string]string{"error": "este e-mail já está em uso"})
			return
		}
	}

	if wantsNewPassword {
		if len(body.NewPassword) < 6 {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "a nova senha deve ter ao menos 6 caracteres"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao processar a senha"})
			return
		}
		u.PasswordHash = string(hash)
	}

	u.Name = name
	u.Email = email
	if err := h.DB.Save(&u).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao salvar o perfil"})
		return
	}

	// Reemite o token/cookie para refletir o e-mail atualizado nas claims.
	if tok, err := auth.Sign(u.ID, u.Role, u.Email); err == nil {
		setAuthCookie(w, tok)
	}
	writeJSON(w, http.StatusOK, u)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secureCookies(),
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
	})
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// secureCookies marca o cookie como Secure (HTTPS-only) somente quando
// COOKIE_SECURE=true. Default é false para suportar deploy atrás de proxy
// HTTP (ex.: http://rastreio.uppertruck.com). Ative quando colocar TLS.
func secureCookies() bool {
	return strings.EqualFold(os.Getenv("COOKIE_SECURE"), "true")
}

// setAuthCookie grava o cookie de sessão (httpOnly) com o token informado.
// Usado tanto no login quanto na renovação feita pelo /api/auth/me.
func setAuthCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secureCookies(),
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(cookieTTL),
		MaxAge:   int(cookieTTL.Seconds()),
	})
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
