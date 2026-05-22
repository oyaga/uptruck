package models

import "time"

type Cotacao struct {
	ID        uint      `gorm:"primaryKey"                       json:"id"`
	Status    string    `gorm:"size:40;not null" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Rota
	CepOri      *string  `gorm:"column:cep_ori;size:10"          json:"cep_ori,omitempty"`
	UfOri       string   `gorm:"column:uf_ori;size:2;not null"   json:"uf_ori"`
	CidadeOri   string   `gorm:"column:cidade_ori;size:100;not null" json:"cidade_ori"`
	BairroOri   *string  `gorm:"column:bairro_ori;size:100"      json:"bairro_ori,omitempty"`
	CepDes      *string  `gorm:"column:cep_des;size:10"          json:"cep_des,omitempty"`
	UfDes       string   `gorm:"column:uf_des;size:2;not null"   json:"uf_des"`
	CidadeDes   string   `gorm:"column:cidade_des;size:100;not null" json:"cidade_des"`
	BairroDes   *string  `gorm:"column:bairro_des;size:100"      json:"bairro_des,omitempty"`
	DistanciaKm float64  `gorm:"column:distancia_km;not null"    json:"distancia_km"`

	// Carga
	Produto    *string  `gorm:"size:200"             json:"produto,omitempty"`
	Embalagem  *string  `gorm:"size:50"              json:"embalagem,omitempty"`
	Unitizacao *string  `gorm:"size:50"              json:"unitizacao,omitempty"`
	PesoKg     *float64 `gorm:"column:peso_kg"       json:"peso_kg,omitempty"`
	Volumes    *int     `gorm:"column:volumes"       json:"volumes,omitempty"`
	CubagemM3  *float64 `gorm:"column:cubagem_m3"    json:"cubagem_m3,omitempty"`
	ValorNf    *float64 `gorm:"column:valor_nf"      json:"valor_nf,omitempty"`

	// ANTT
	Veiculo       string  `gorm:"size:20;not null"          json:"veiculo"`
	Categoria     string  `gorm:"size:30;not null"          json:"categoria"`
	AnttMin       float64 `gorm:"column:antt_min;not null"  json:"antt_min"`
	ValorSugerido float64 `gorm:"column:valor_sugerido;not null" json:"valor_sugerido"`

	// Aprovação
	AdminComment *string    `gorm:"column:admin_comment"      json:"admin_comment,omitempty"`
	ApprovedBy   *uint      `gorm:"column:approved_by"        json:"approved_by,omitempty"`
	ApprovedAt   *time.Time `gorm:"column:approved_at"        json:"approved_at,omitempty"`

	// Autor
	CreatedBy *uint `gorm:"column:created_by" json:"created_by,omitempty"`

	// Empresas vinculadas — opcional. Preenchidas quando o cotador escolhe
	// um cadastro salvo para a coleta (origem) e/ou a entrega (destino).
	EmpresaOriID *uint    `gorm:"column:empresa_ori_id"   json:"empresa_ori_id,omitempty"`
	EmpresaOri   *Empresa `gorm:"foreignKey:EmpresaOriID" json:"empresa_ori,omitempty"`
	EmpresaDesID *uint    `gorm:"column:empresa_des_id"   json:"empresa_des_id,omitempty"`
	EmpresaDes   *Empresa `gorm:"foreignKey:EmpresaDesID" json:"empresa_des,omitempty"`
}

func (Cotacao) TableName() string { return "cotacoes" }
