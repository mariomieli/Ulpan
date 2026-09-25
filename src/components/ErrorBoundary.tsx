import { Component, type ReactNode } from 'react';

/** Evita la pagina bianca: se una sezione non si carica (es. dopo un aggiornamento) propone di ricaricare. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: false });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card empty" role="alert">
        <h2>Qualcosa non si è caricato</h2>
        <p>Probabilmente è appena uscita una nuova versione dell’app. Ricarica la pagina per continuare: i progressi sono al sicuro.</p>
        <button className="btn btn-primary" onClick={() => location.reload()}>Ricarica</button>
      </div>
    );
  }
}
