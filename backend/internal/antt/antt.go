package antt

import "math"

type Veiculo struct {
	Label   string
	RatePKM float64 // R$/km
	Minimo  float64 // valor mínimo de viagem
}

// Tabela ANTT 2025 — equivalente ao VEI do CalculadoraANTT.jsx
var Veiculos = map[string]Veiculo{
	"VUC":         {"VUC (até 3,5t)", 1.4258, 158.19},
	"3/4":         {"3/4 (até 6t)", 1.4912, 165.45},
	"Toco":        {"Toco (até 14t)", 2.1274, 236.38},
	"Truck":       {"Truck (até 23t)", 2.4851, 275.89},
	"Carreta":     {"Carreta (até 33t)", 3.0567, 339.41},
	"Carreta LS":  {"Carreta LS (até 41,5t)", 3.4068, 378.46},
	"Bi-trem":     {"Bi-trem (até 45t)", 3.8534, 427.97},
}

// Fatores por categoria — equivalente ao CAT do CalculadoraANTT.jsx
var Categorias = map[string]float64{
	"Geral":          1.00,
	"Frigorificada":  1.15,
	"Granel Sólido":  0.95,
	"Granel Líquido": 1.00,
	"Neogranel":      1.00,
	"Perigosa":       1.30,
}

// CalcMin replica calcMin(veiculo, distancia, categoria) do JSX.
func CalcMin(veiculo string, distancia float64, categoria string) float64 {
	v, ok := Veiculos[veiculo]
	if !ok || distancia <= 0 {
		return 0
	}
	fator, ok := Categorias[categoria]
	if !ok {
		fator = 1
	}
	base := math.Max(v.Minimo, v.RatePKM*distancia)
	return math.Round(base*fator*100) / 100
}
