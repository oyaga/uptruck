package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"freteantt/internal/handlers"
	mw "freteantt/internal/middleware"
	"freteantt/internal/models"
	"freteantt/internal/notify"
	"freteantt/internal/push"
	"freteantt/manager"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func seedUsers(db *gorm.DB) {
	defaults := []struct {
		Email, Name, Role, Password string
	}{
		{"admin@freteantt.com", "Admin", "admin", "admin123"},
		{"cotador@freteantt.com", "Cotador", "cotador", "cotador123"},
	}
	for _, d := range defaults {
		var count int64
		db.Model(&models.User{}).Where("email = ?", d.Email).Count(&count)
		if count > 0 {
			continue
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(d.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("falha ao gerar hash para %s: %v", d.Email, err)
			continue
		}
		u := models.User{Email: d.Email, Name: d.Name, Role: d.Role, PasswordHash: string(hash)}
		if err := db.Create(&u).Error; err != nil {
			log.Printf("falha ao seed user %s: %v", d.Email, err)
		} else {
			log.Printf("seed: usuário %s criado (senha inicial: %s)", d.Email, d.Password)
		}
	}
}

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=postgres dbname=freteantt port=5432 sslmode=disable TimeZone=America/Sao_Paulo"
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("falha ao conectar no banco: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{},
		&models.Cotacao{},
		&models.Notificacao{},
		&models.PushSubscription{},
		&models.AppSetting{},
	); err != nil {
		log.Fatalf("falha em automigrate: %v", err)
	}
	seedUsers(db)

	broker := notify.NewBroker()
	pushMgr, err := push.NewManager(db)
	if err != nil {
		log.Printf("AVISO: Web Push desabilitado (%v)", err)
		pushMgr = nil
	}

	authH := &handlers.AuthHandler{DB: db}
	cotH := &handlers.CotacaoHandler{DB: db, Broker: broker, Push: pushMgr}
	notifH := &handlers.NotificacaoHandler{DB: db, Broker: broker}
	pushH := &handlers.PushHandler{DB: db, Manager: pushMgr}

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)

	if origins := strings.TrimSpace(os.Getenv("CORS_ORIGINS")); origins != "" {
		r.Use(cors.Handler(cors.Options{
			AllowedOrigins:   strings.Split(origins, ","),
			AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders:   []string{"Authorization", "Content-Type"},
			AllowCredentials: true,
			MaxAge:           300,
		}))
	}

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	})

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/login", authH.Login)
		r.Post("/auth/logout", authH.Logout)

		// VAPID public key — público (cliente precisa antes de logar pra montar a subscription)
		r.Get("/push/vapid-public-key", pushH.PublicKey)

		// Endpoints com timeout (mutações + leituras curtas)
		r.Group(func(r chi.Router) {
			r.Use(chimw.Timeout(30 * time.Second))
			r.Use(mw.RequireAuth)

			// auth (autenticada)
			r.Get("/auth/me", authH.Me)

			// cotador
			r.Post("/cotacoes", cotH.Create)
			r.Get("/cotacoes", cotH.ListMine)

			// notificações (REST)
			r.Get("/notificacoes", notifH.List)
			r.Get("/notificacoes/unread-count", notifH.UnreadCount)
			r.Patch("/notificacoes/{id}/read", notifH.MarkRead)
			r.Post("/notificacoes/read-all", notifH.MarkAllRead)

			// push subscriptions
			r.Post("/push/subscribe", pushH.Subscribe)
			r.Post("/push/unsubscribe", pushH.Unsubscribe)

			// admin
			r.Group(func(r chi.Router) {
				r.Use(mw.RequireRole("admin"))
				r.Get("/admin/cotacoes", cotH.ListAll)
				r.Patch("/admin/cotacoes/{id}/aprovar", cotH.Aprovar)
				r.Patch("/admin/cotacoes/{id}/reprovar", cotH.Reprovar)
			})
		})

		// SSE — sem timeout (conexão long-lived). Auth ainda obrigatória.
		r.Group(func(r chi.Router) {
			r.Use(mw.RequireAuth)
			r.Get("/notificacoes/stream", notifH.Stream)
		})
	})

	// Frontend embutido (Next.js export)
	r.Handle("/*", manager.Handler())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("FreteANTT (API + UI) ouvindo em :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
