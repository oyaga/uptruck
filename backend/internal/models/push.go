package models

import "time"

// PushSubscription guarda uma assinatura Web Push de um dispositivo do
// usuário (cada navegador/PWA gera um endpoint único). Um usuário pode ter
// múltiplas (celular + desktop, por exemplo). O endpoint é unique pra
// evitar duplicatas se o mesmo dispositivo se inscrever de novo.
type PushSubscription struct {
	ID         uint       `gorm:"primaryKey"                                  json:"id"`
	UserID     uint       `gorm:"not null;index"                              json:"user_id"`
	Endpoint   string     `gorm:"type:text;uniqueIndex:idx_push_endpoint;not null" json:"endpoint"`
	P256dh     string     `gorm:"type:text;not null"                          json:"-"`
	Auth       string     `gorm:"type:text;not null"                          json:"-"`
	UserAgent  *string    `gorm:"column:user_agent;type:text"                 json:"user_agent,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	LastUsedAt *time.Time `gorm:"column:last_used_at"                         json:"last_used_at,omitempty"`
}

func (PushSubscription) TableName() string { return "push_subscriptions" }

// AppSetting é uma tabela genérica de chave/valor pra config persistente
// (ex: VAPID keys auto-geradas no primeiro boot, evitam regerar a cada
// restart e quebrar subscriptions existentes).
type AppSetting struct {
	Key       string    `gorm:"primaryKey;size:64" json:"key"`
	Value     string    `gorm:"type:text"          json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (AppSetting) TableName() string { return "app_settings" }
