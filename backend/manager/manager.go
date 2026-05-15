// Package manager embute o build estático do Next.js (manager/dist) e expõe
// um http.Handler único para o servidor Go. Mantém a aplicação distribuída
// como um único binário, sem servidor Node em produção.
//
// Resolve cada URL para um arquivo concreto da SPA (export do Next) e
// usa http.ServeFileFS — que serve o arquivo nomeado sem aplicar o
// redirect built-in de "/index.html" → "./" do http.FileServer (que
// causava loop infinito quando a URL final era "/" servindo "index.html").

package manager

import (
	"embed"
	"errors"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed all:dist
var distFS embed.FS

// Handler retorna o http.Handler que serve a SPA estática do Next.js export.
// Estratégia de resolução para a URL recebida:
//
//  1. Arquivo exato (asset, /icon.svg, /sw.js, /_next/...)
//  2. URL+".html"  (Next.js export grava /cotacao.html, /cotacao/nova.html)
//  3. URL+"/index.html"  (caso exista)
//  4. Fallback SPA: /index.html (rotas client-side)
//
// O r.URL.Path NUNCA é reescrito — o ServeFileFS recebe o nome do arquivo
// resolvido como argumento separado, então não dispara o auto-redirect que
// o serveFile interno do http.FileServer aplica para paths terminando em
// "/index.html".
func Handler() http.Handler {
	sub, err := fs.Sub(distFS, "dist")
	if err != nil {
		return placeholder(err)
	}
	if !hasIndex(sub) {
		return placeholder(errors.New("manager/dist vazio — rode `bun run build` em frontend/"))
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := strings.TrimSuffix(strings.TrimPrefix(path.Clean(r.URL.Path), "/"), "/")
		target := resolve(sub, clean)
		http.ServeFileFS(w, r, sub, target)
	})
}

func resolve(sub fs.FS, p string) string {
	if p == "" || p == "." {
		return "index.html"
	}
	// 1) Existe como arquivo? Sirva direto.
	if info, err := fs.Stat(sub, p); err == nil && !info.IsDir() {
		return p
	}
	// 2) Versão .html sibling — gerada pelo Next.js export
	if info, err := fs.Stat(sub, p+".html"); err == nil && !info.IsDir() {
		return p + ".html"
	}
	// 3) index.html dentro do diretório
	if info, err := fs.Stat(sub, p+"/index.html"); err == nil && !info.IsDir() {
		return p + "/index.html"
	}
	// 4) SPA fallback
	return "index.html"
}

func hasIndex(f fs.FS) bool {
	_, err := fs.Stat(f, "index.html")
	return err == nil
}

func placeholder(err error) http.Handler {
	msg := "Frontend não disponível: " + err.Error() +
		"\n\nNo diretório frontend/:\n  bun install\n  bun run build\n\nIsso gera backend/manager/dist/ que será embutido no binário Go."
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(msg))
	})
}
