package models

import "time"

// Notificacao representa um aviso entregue a um usuário (admin ou cotador).
// Tipos atuais:
//   cotacao_pendente   — admin recebeu nova cotação para aprovar
//   cotacao_aprovada   — cotador teve sua cotação aprovada
//   cotacao_reprovada  — cotador teve sua cotação reprovada
type Notificacao struct {
	ID        uint       `gorm:"primaryKey"             json:"id"`
	UserID    uint       `gorm:"not null;index"         json:"user_id"`
	Type      string     `gorm:"size:40;not null"       json:"type"`
	Title     string     `gorm:"size:200;not null"      json:"title"`
	Message   string     `gorm:"type:text"              json:"message"`
	CotacaoID *uint      `gorm:"column:cotacao_id"      json:"cotacao_id,omitempty"`
	ReadAt    *time.Time `gorm:"column:read_at;index"   json:"read_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (Notificacao) TableName() string { return "notificacoes" }
