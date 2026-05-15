package middleware

import (
	"context"
	"net/http"
	"strings"

	"freteantt/internal/auth"
)

type ctxKey string

const userKey ctxKey = "user"

type CtxUser struct {
	ID    uint
	Role  string
	Email string
}

func FromContext(ctx context.Context) (CtxUser, bool) {
	u, ok := ctx.Value(userKey).(CtxUser)
	return u, ok
}

func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tok := bearer(r)
		if tok == "" {
			http.Error(w, `{"error":"token ausente"}`, http.StatusUnauthorized)
			return
		}
		c, err := auth.Parse(tok)
		if err != nil {
			http.Error(w, `{"error":"token inválido"}`, http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userKey, CtxUser{ID: c.UserID, Role: c.Role, Email: c.Email})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := FromContext(r.Context())
			if !ok || u.Role != role {
				http.Error(w, `{"error":"acesso negado"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
	}
	if c, err := r.Cookie("token"); err == nil {
		return c.Value
	}
	return ""
}
