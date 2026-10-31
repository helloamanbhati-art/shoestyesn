import { FormEvent, useEffect, useRef, useState } from 'react';
import { Bot, ExternalLink, MessageCircle, Phone, Send, X } from 'lucide-react';
import { Link } from 'react-router';
import { useProductContext } from '../contexts/ProductContext';
import { answerStoreQuestion, type ChatAnswer } from '../chatbot/chatbotKnowledge';

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  answer?: ChatAnswer;
}

const QUICK_QUESTIONS = [
  { label: 'Shop products', question: 'Show me shoes' },
  { label: 'Delivery info', question: 'Tell me about delivery' },
  { label: 'Store timings', question: 'What time do you open?' },
  { label: 'Call us', question: 'Give me both phone numbers' },
  { label: 'WhatsApp', question: 'Open WhatsApp' },
  { label: 'About us', question: 'Tell me about Shoe Style' },
] as const;

const INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  role: 'assistant',
  text: 'Hi! I’m the Shoe Style assistant. Ask me about our live catalogue, sizes, delivery, store details, payments, or contact options.',
};

function AnswerContent({ answer }: { answer: ChatAnswer }) {
  return (
    <>
      {answer.products?.length ? (
        <div className="store-chat-products">
          {answer.products.map((product) => (
            <Link key={product.id} to={`/product/${product.id}`} className="store-chat-product">
              <span>{product.name}</span>
              <strong>₹{product.price.toLocaleString('en-IN')}</strong>
            </Link>
          ))}
        </div>
      ) : null}
      {answer.actions?.length ? (
        <div className="store-chat-actions">
          {answer.actions.map((action) => {
            const external = action.href.startsWith('http');
            return (
              <a key={`${action.label}-${action.href}`} href={action.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                {action.href.startsWith('tel:') ? <Phone aria-hidden="true" /> : null}
                {action.label}
                {external ? <ExternalLink aria-hidden="true" /> : null}
              </a>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

export function StoreChatbot() {
  const { products } = useProductContext();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function closeChat() {
    setOpen(false);
    window.setTimeout(() => launcherRef.current?.focus(), 0);
  }

  function ask(question: string) {
    const cleanQuestion = question.trim();
    if (!cleanQuestion) return;
    const answer = answerStoreQuestion(cleanQuestion, products);
    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: 'user', text: cleanQuestion },
      { id: id + 1, role: 'assistant', text: answer.text, answer },
    ]);
    setInput('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  return (
    <div className={`store-chat ${open ? 'is-open' : ''}`}>
      {open ? (
        <section className="store-chat-panel" role="dialog" aria-modal="false" aria-labelledby="store-chat-title" onKeyDown={(event) => event.key === 'Escape' && closeChat()}>
          <header className="store-chat-header">
            <span className="store-chat-avatar"><Bot aria-hidden="true" /></span>
            <div><h2 id="store-chat-title">Shoe Style Assistant</h2><p><span aria-hidden="true" /> Online · replies instantly</p></div>
            <button type="button" onClick={closeChat} aria-label="Close chat"><X aria-hidden="true" /></button>
          </header>

          <div className="store-chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <div key={message.id} className={`store-chat-message is-${message.role}`}>
                <p>{message.text}</p>
                {message.answer ? <AnswerContent answer={message.answer} /> : null}
              </div>
            ))}
            {messages.length === 1 ? (
              <div className="store-chat-quick" aria-label="Popular questions">
                {QUICK_QUESTIONS.map((item) => <button type="button" key={item.label} onClick={() => ask(item.question)}>{item.label}</button>)}
              </div>
            ) : null}
          </div>

          <form className="store-chat-form" onSubmit={submit}>
            <label htmlFor="store-chat-input" className="sr-only">Ask Shoe Style a question</label>
            <input ref={inputRef} id="store-chat-input" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your question…" autoComplete="off" />
            <button type="submit" aria-label="Send message" disabled={!input.trim()}><Send aria-hidden="true" /></button>
          </form>
          <p className="store-chat-note">Answers use information published on this website.</p>
        </section>
      ) : null}

      <button ref={launcherRef} type="button" className="store-chat-launcher" onClick={() => setOpen(true)} aria-label="Open Shoe Style assistant" aria-expanded={open}>
        <MessageCircle aria-hidden="true" /><span>Ask us</span>
      </button>
    </div>
  );
}
