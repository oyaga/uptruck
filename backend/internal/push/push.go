// Package push implementa Web Push (VAPID + envio via webpush-go).
//
// Comportamento das chaves VAPID:
//  1. Se VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY estão no env, usa essas
//  2. Senão, busca no AppSetting (DB) — para persistência entre restarts
//  3. Senão, gera um par novo, salva no DB e usa
//
// Isso evita config manual: o admin sobe a stack e push já funciona.
// Se quiser controlar por env, basta setar.

package push

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"freteantt/internal/models"

	webpush "github.com/SherClockHolmes/webpush-go"
	"gorm.io/gorm"
)

const (
	settingPubKey  = "vapid_public_key"
	settingPrivKey = "vapid_private_key"
	defaultSubject = "admin@uppertruck.com"
)

type Manager struct {
	PublicKey  string
	privateKey string
	subject    string
	db         *gorm.DB
}

func NewManager(db *gorm.DB) (*Manager, error) {
	pub := os.Getenv("VAPID_PUBLIC_KEY")
	priv := os.Getenv("VAPID_PRIVATE_KEY")

	if pub == "" || priv == "" {
		var pubS, privS models.AppSetting
		errPub := db.Where("key = ?", settingPubKey).First(&pubS).Error
		errPriv := db.Where("key = ?", settingPrivKey).First(&privS).Error

		if errPub == nil && errPriv == nil {
			pub, priv = pubS.Value, privS.Value
		} else {
			newPriv, newPub, err := webpush.GenerateVAPIDKeys()
			if err != nil {
				return nil, fmt.Errorf("gerar VAPID: %w", err)
			}
			pub, priv = newPub, newPriv
			db.Save(&models.AppSetting{Key: settingPubKey, Value: pub})
			db.Save(&models.AppSetting{Key: settingPrivKey, Value: priv})
			log.Printf("VAPID keys geradas e persistidas no DB")
		}
	}

	subject := strings.TrimSpace(os.Getenv("PUSH_SUBJECT"))
	if subject == "" {
		subject = defaultSubject
	}
	// webpush-go já adiciona "mailto:" — garantimos que não venha duplicado
	subject = strings.TrimPrefix(subject, "mailto:")

	return &Manager{
		PublicKey:  pub,
		privateKey: priv,
		subject:    subject,
		db:         db,
	}, nil
}

// Payload representa o JSON entregue ao service worker no evento `push`.
type Payload struct {
	Title   string `json:"title"`
	Message string `json:"message,omitempty"`
	URL     string `json:"url,omitempty"`
	Tag     string `json:"tag,omitempty"`
	Icon    string `json:"icon,omitempty"`
}

// SendToUser envia (em paralelo) a notificação push para todos os devices
// do usuário. Subscriptions inválidas (410/404) são apagadas do DB.
func (m *Manager) SendToUser(userID uint, p Payload) {
	if m == nil {
		return
	}
	body, err := json.Marshal(p)
	if err != nil {
		return
	}

	var subs []models.PushSubscription
	if err := m.db.Where("user_id = ?", userID).Find(&subs).Error; err != nil {
		return
	}

	for _, s := range subs {
		s := s
		go m.send(&s, body)
	}
}

func (m *Manager) send(s *models.PushSubscription, payload []byte) {
	wsub := &webpush.Subscription{
		Endpoint: s.Endpoint,
		Keys: webpush.Keys{
			P256dh: s.P256dh,
			Auth:   s.Auth,
		},
	}
	resp, err := webpush.SendNotification(payload, wsub, &webpush.Options{
		Subscriber:      m.subject,
		VAPIDPublicKey:  m.PublicKey,
		VAPIDPrivateKey: m.privateKey,
		TTL:             86400, // 24h — garante entrega mesmo com dispositivo offline
	})
	if err != nil {
		log.Printf("webpush erro (sub %d): %v", s.ID, err)
		return
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusGone, http.StatusNotFound:
		m.db.Delete(s)
	case http.StatusOK, http.StatusCreated, http.StatusAccepted, http.StatusNoContent:
		log.Printf("webpush ok (sub %d): %d", s.ID, resp.StatusCode)
	default:
		body, _ := io.ReadAll(resp.Body)
		// VapidPkHashMismatch (400): a subscription foi criada com uma chave
		// VAPID antiga (DB recriado etc.) — nunca mais vai funcionar. Apaga
		// pra limpar o cadastro; o frontend re-inscreve no próximo open.
		if resp.StatusCode == http.StatusBadRequest &&
			strings.Contains(string(body), "VapidPkHashMismatch") {
			m.db.Delete(s)
		}
		log.Printf("webpush erro (sub %d): status=%d body=%s endpoint=%s",
			s.ID, resp.StatusCode, string(body), s.Endpoint)
	}
}
