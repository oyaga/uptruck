package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"freteantt/internal/models"

	"github.com/xuri/excelize/v2"
)

// ExportXlsx — exporta as cotações filtradas em planilha Excel no formato
// usado no controle interno (DATA COTAÇÃO, UF/CIDADE ORIGEM/DESTINO,
// PRODUTO, PESO TOTAL (KG), VOL, CUBAGEM, VALOR DE NOTA, VALOR DO FRETE,
// STATUS). Filtros aceitos por query string: status, uf_ori, uf_des,
// from (YYYY-MM-DD), to (YYYY-MM-DD inclusive).
func (h *CotacaoHandler) ExportXlsx(w http.ResponseWriter, r *http.Request) {
	var list []models.Cotacao
	q := h.DB.Order("created_at DESC")
	if s := r.URL.Query().Get("status"); s != "" {
		q = q.Where("status = ?", s)
	}
	if uf := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("uf_ori"))); uf != "" {
		q = q.Where("uf_ori = ?", uf)
	}
	if uf := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("uf_des"))); uf != "" {
		q = q.Where("uf_des = ?", uf)
	}
	if from := strings.TrimSpace(r.URL.Query().Get("from")); from != "" {
		q = q.Where("created_at >= ?", from)
	}
	if to := strings.TrimSpace(r.URL.Query().Get("to")); to != "" {
		q = q.Where("created_at <= ?", to+"T23:59:59")
	}
	if err := q.Find(&list).Error; err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "falha ao listar cotações"})
		return
	}

	f := excelize.NewFile()
	defer func() { _ = f.Close() }()

	sheet := "Cotações"
	idx, _ := f.NewSheet(sheet)
	f.SetActiveSheet(idx)
	_ = f.DeleteSheet("Sheet1")

	headers := []string{
		"DATA COTAÇÃO", "UF ORIGEM", "CIDADE ORIGEM", "UF DESTINO", "CIDADE DESTINO",
		"PRODUTO", "PESO TOTAL (KG)", "VOL", "CUBAGEM", "VALOR DE NOTA",
		"VALOR DO FRETE", "STATUS",
	}
	for i, hdr := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, hdr)
	}

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"222222"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})
	_ = f.SetCellStyle(sheet, "A1", "L1", headerStyle)
	_ = f.SetRowHeight(sheet, 1, 28)

	// Estilos por tipo de coluna.
	dateStyle, _ := f.NewStyle(&excelize.Style{
		CustomNumFmt: stringPtr("dd/mm/yy"),
		Alignment:    &excelize.Alignment{Horizontal: "center"},
	})
	intStyle, _ := f.NewStyle(&excelize.Style{
		NumFmt:    3, // #,##0
		Alignment: &excelize.Alignment{Horizontal: "right"},
	})
	moneyStyle, _ := f.NewStyle(&excelize.Style{
		NumFmt:    4, // #,##0.00
		Alignment: &excelize.Alignment{Horizontal: "right"},
	})
	centerStyle, _ := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})

	for i, c := range list {
		row := i + 2 // linha 1 é cabeçalho

		// Grava como data real do Excel (serial number); o numFmt cuida da
		// exibição "dd/mm/yy" e mantém ordenação/filtragem por data no Excel.
		_ = f.SetCellValue(sheet, fmt.Sprintf("A%d", row), c.CreatedAt)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), dateStyle)

		_ = f.SetCellValue(sheet, fmt.Sprintf("B%d", row), c.UfOri)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), centerStyle)

		_ = f.SetCellValue(sheet, fmt.Sprintf("C%d", row), c.CidadeOri)

		_ = f.SetCellValue(sheet, fmt.Sprintf("D%d", row), c.UfDes)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), centerStyle)

		_ = f.SetCellValue(sheet, fmt.Sprintf("E%d", row), c.CidadeDes)

		if c.Produto != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("F%d", row), *c.Produto)
		}

		if c.PesoKg != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("G%d", row), *c.PesoKg)
			_ = f.SetCellStyle(sheet, fmt.Sprintf("G%d", row), fmt.Sprintf("G%d", row), intStyle)
		}
		if c.Volumes != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("H%d", row), *c.Volumes)
			_ = f.SetCellStyle(sheet, fmt.Sprintf("H%d", row), fmt.Sprintf("H%d", row), intStyle)
		}
		if c.CubagemM3 != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("I%d", row), *c.CubagemM3)
			_ = f.SetCellStyle(sheet, fmt.Sprintf("I%d", row), fmt.Sprintf("I%d", row), moneyStyle)
		}
		if c.ValorNf != nil {
			_ = f.SetCellValue(sheet, fmt.Sprintf("J%d", row), *c.ValorNf)
			_ = f.SetCellStyle(sheet, fmt.Sprintf("J%d", row), fmt.Sprintf("J%d", row), moneyStyle)
		}

		_ = f.SetCellValue(sheet, fmt.Sprintf("K%d", row), c.ValorSugerido)
		_ = f.SetCellStyle(sheet, fmt.Sprintf("K%d", row), fmt.Sprintf("K%d", row), moneyStyle)

		_ = f.SetCellValue(sheet, fmt.Sprintf("L%d", row), c.Status)
	}

	// Larguras das colunas — proporcionais ao conteúdo típico.
	widths := []struct {
		col   string
		width float64
	}{
		{"A", 12}, {"B", 10}, {"C", 22}, {"D", 10}, {"E", 22},
		{"F", 30}, {"G", 14}, {"H", 8}, {"I", 12}, {"J", 14},
		{"K", 14}, {"L", 22},
	}
	for _, wd := range widths {
		_ = f.SetColWidth(sheet, wd.col, wd.col, wd.width)
	}

	// Cabeçalho fixo + filtro do Excel.
	_ = f.SetPanes(sheet, &excelize.Panes{
		Freeze: true, Split: false,
		XSplit: 0, YSplit: 1,
		TopLeftCell: "A2", ActivePane: "bottomLeft",
	})
	_ = f.AutoFilter(sheet, fmt.Sprintf("A1:L%d", len(list)+1), nil)

	filename := fmt.Sprintf("cotacoes_%s.xlsx", time.Now().Format("2006-01-02"))
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	if err := f.Write(w); err != nil {
		// header já foi escrito — best-effort de log
		fmt.Println("erro ao escrever xlsx:", err)
	}
}

func stringPtr(s string) *string { return &s }
