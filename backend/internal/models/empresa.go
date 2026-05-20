package models

import "time"

// Empresa é um cadastro reutilizável (cliente/fornecedor) usado para
// pré-preencher os dados de coleta e entrega de uma cotação, evitando
// retrabalho. O CNPJ é armazenado apenas com dígitos (14) e é único.
type Empresa struct {
	ID           uint      `gorm:"primaryKey"                               json:"id"`
	CNPJ         string    `gorm:"column:cnpj;size:14;uniqueIndex;not null" json:"cnpj"`
	RazaoSocial  string    `gorm:"column:razao_social;size:200;not null"    json:"razao_social"`
	NomeFantasia *string   `gorm:"column:nome_fantasia;size:200"            json:"nome_fantasia,omitempty"`
	Cep          *string   `gorm:"column:cep;size:9"                        json:"cep,omitempty"`
	Logradouro   *string   `gorm:"column:logradouro;size:200"               json:"logradouro,omitempty"`
	Numero       *string   `gorm:"column:numero;size:20"                    json:"numero,omitempty"`
	Complemento  *string   `gorm:"column:complemento;size:100"              json:"complemento,omitempty"`
	Bairro       *string   `gorm:"column:bairro;size:100"                   json:"bairro,omitempty"`
	Cidade       string    `gorm:"column:cidade;size:100;not null"          json:"cidade"`
	Uf           string    `gorm:"column:uf;size:2;not null"                json:"uf"`
	Telefone     *string   `gorm:"column:telefone;size:30"                  json:"telefone,omitempty"`
	Email        *string   `gorm:"column:email;size:160"                    json:"email,omitempty"`
	Situacao     *string   `gorm:"column:situacao;size:40"                  json:"situacao,omitempty"`
	CreatedBy    *uint     `gorm:"column:created_by"                        json:"created_by,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (Empresa) TableName() string { return "empresas" }
