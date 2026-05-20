package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint   `json:"uid"`
	Role   string `json:"role"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

func secret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "dev-secret-change-me"
	}
	return []byte(s)
}

// TTL do JWT — efetivamente permanente (10 anos). Combinado com a renovação
// do cookie a cada boot do app (ver handler Me), a sessão não expira para
// quem usa o sistema periodicamente: nenhum relogin de rotina é necessário.
const TokenTTL = 10 * 365 * 24 * time.Hour

func Sign(userID uint, role, email string) (string, error) {
	now := time.Now()
	c := &Claims{
		UserID: userID,
		Role:   role,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(TokenTTL)),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return t.SignedString(secret())
}

func Parse(tok string) (*Claims, error) {
	c := &Claims{}
	t, err := jwt.ParseWithClaims(tok, c, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("método de assinatura inválido")
		}
		return secret(), nil
	})
	if err != nil || !t.Valid {
		return nil, errors.New("token inválido")
	}
	return c, nil
}
