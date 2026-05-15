// Package notify implementa um broker SSE in-process. Cada usuário pode ter
// múltiplas conexões abertas (várias abas, dispositivos); cada uma é um
// channel buffered. Publish faz fan-out não-bloqueante — se um canal estiver
// cheio, o evento é descartado para aquele cliente em vez de travar o emissor.

package notify

import (
	"sync"
)

type Event struct {
	Type string `json:"type"` // ex: "notificacao", "cotacao_atualizada"
	Data any    `json:"data"`
}

type Broker struct {
	mu      sync.RWMutex
	clients map[uint]map[chan Event]struct{}
}

func NewBroker() *Broker {
	return &Broker{clients: make(map[uint]map[chan Event]struct{})}
}

// Subscribe abre um canal de eventos para o usuário e devolve uma função
// para liberar a inscrição quando a conexão SSE fechar.
func (b *Broker) Subscribe(userID uint) (chan Event, func()) {
	ch := make(chan Event, 16)
	b.mu.Lock()
	if _, ok := b.clients[userID]; !ok {
		b.clients[userID] = make(map[chan Event]struct{})
	}
	b.clients[userID][ch] = struct{}{}
	b.mu.Unlock()

	unsub := func() {
		b.mu.Lock()
		if set, ok := b.clients[userID]; ok {
			delete(set, ch)
			if len(set) == 0 {
				delete(b.clients, userID)
			}
		}
		b.mu.Unlock()
		close(ch)
	}
	return ch, unsub
}

// Publish entrega o evento para todas as conexões ativas do usuário.
// Não bloqueia: se um buffer estiver cheio, o evento é dropado para aquele
// cliente (que vai recuperar o estado via REST quando reconectar).
func (b *Broker) Publish(userID uint, ev Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for ch := range b.clients[userID] {
		select {
		case ch <- ev:
		default:
		}
	}
}

// PublishTo entrega o mesmo evento para vários usuários (ex: todos os admins
// quando uma cotação é criada).
func (b *Broker) PublishTo(userIDs []uint, ev Event) {
	for _, uid := range userIDs {
		b.Publish(uid, ev)
	}
}
