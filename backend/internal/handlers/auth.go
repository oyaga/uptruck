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
const cookieTTL = auth.TokenTTL // alinhado com o JWT (30 dias)

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

	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    tok,
		Path:     "/",
		HttpOnly: true,
		Secure:   secureCookies(),
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(cookieTTL),
		MaxAge:   int(cookieTTL.Seconds()),
	})

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

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
