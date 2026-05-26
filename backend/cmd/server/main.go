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
	// Só popula os usuários padrão quando o sistema está zerado. Assim, se
	// alguém alterar o próprio e-mail pelo perfil, o seed não recria a conta
	// antiga com a senha default no próximo boot.
	var total int64
	db.Model(&models.User{}).Count(&total)
	if total > 0 {
		return
	}
	defaults := []struct {
		Email, Name, Role, Password string
	}{
		{"ivan@uppertruck.com", "Ivan", "admin", "admin123"},
		{"laura@uppertruck.com", "Laura", "cotador", "laura123"},
	}
	for _, d := range defaults {
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

// renameLegacySeedUsers migra as contas semente originais (@freteantt.com)
// para os e-mails definitivos (@uppertruck.com). É idempotente: depois da
// renomeação os e-mails antigos deixam de existir, então nos próximos boots
// a função vira um no-op.
func renameLegacySeedUsers(db *gorm.DB) {
	migrations := []struct {
		OldEmail, NewEmail, NewName, NewPassword string
	}{
		{"admin@freteantt.com", "ivan@uppertruck.com", "Ivan", ""},
		{"cotador@freteantt.com", "laura@uppertruck.com", "Laura", "laura123"},
	}
	for _, m := range migrations {
		var u models.User
		if err := db.Where("email = ?", m.OldEmail).First(&u).Error; err != nil {
			continue // já migrado ou inexistente
		}
		var clash int64
		db.Model(&models.User{}).Where("email = ?", m.NewEmail).Count(&clash)
		if clash > 0 {
			log.Printf("migração: %s mantido — %s já está em uso", m.OldEmail, m.NewEmail)
			continue
		}
		u.Email = m.NewEmail
		u.Name = m.NewName
		if m.NewPassword != "" {
			hash, err := bcrypt.GenerateFromPassword([]byte(m.NewPassword), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("migração: falha ao gerar hash para %s: %v", m.NewEmail, err)
				continue
			}
			u.PasswordHash = string(hash)
		}
		if err := db.Save(&u).Error; err != nil {
			log.Printf("migração: falha ao renomear %s: %v", m.OldEmail, err)
			continue
		}
		log.Printf("migração: conta %s migrada para %s", m.OldEmail, m.NewEmail)
	}
}

// migrateCotacaoStatus converte os status antigos para o novo fluxo.
// Idempotente: depois de convertidos, os status antigos não existem mais.
func migrateCotacaoStatus(db *gorm.DB) {
	conversoes := map[string]string{
		"Aguardando": "Em Análise",
		"Aprovada":   "Fechada",
		"Reprovada":  "Recusada",
	}
	for antigo, novo := range conversoes {
		db.Model(&models.Cotacao{}).Where("status = ?", antigo).Update("status", novo)
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
		&models.Empresa{},
		&models.Cotacao{},
		&models.Notificacao{},
		&models.PushSubscription{},
		&models.AppSetting{},
	); err != nil {
		log.Fatalf("falha em automigrate: %v", err)
	}
	seedUsers(db)
	renameLegacySeedUsers(db)
	migrateCotacaoStatus(db)

	broker := notify.NewBroker()
	pushMgr, err := push.NewManager(db)
	if err != nil {
		log.Printf("AVISO: Web Push desabilitado (%v)", err)
		pushMgr = nil
	}

	authH := &handlers.AuthHandler{DB: db}
	cotH := &handlers.CotacaoHandler{DB: db, Broker: broker, Push: pushMgr}
	notifH := &handlers.NotificacaoHandler{DB: db, Broker: broker, Push: pushMgr}
	pushH := &handlers.PushHandler{DB: db, Manager: pushMgr}
	empH := &handlers.EmpresaHandler{DB: db}

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
			r.Patch("/auth/profile", authH.UpdateProfile)

			// cotador
			r.Post("/cotacoes", cotH.Create)
			r.Get("/cotacoes", cotH.ListMine)
			r.Patch("/cotacoes/{id}/transicao", cotH.Transicao)

			// empresas — cadastro reutilizável p/ coleta e entrega
			r.Get("/empresas", empH.List)
			r.Post("/empresas", empH.Create)
			r.Get("/empresas/{id}", empH.Get)
			r.Put("/empresas/{id}", empH.Update)
			r.Delete("/empresas/{id}", empH.Delete)

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
				r.Patch("/admin/cotacoes/{id}/responder", cotH.Responder)
				r.Patch("/admin/cotacoes/{id}/recusar", cotH.Recusar)
				r.Get("/admin/users", authH.ListUsers)
				r.Post("/admin/notificacoes/broadcast", notifH.Broadcast)
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
