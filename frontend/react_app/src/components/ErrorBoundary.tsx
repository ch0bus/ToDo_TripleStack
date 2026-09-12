import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { btnPrimary } from "@/lib/uiClasses";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <h1 className="text-xl font-semibold text-app">Что-то пошло не так</h1>
          <p className="mt-2 max-w-md text-sm text-app-muted">
            Обновите страницу. Если ошибка повторяется, вернитесь на главную.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className={btnPrimary}
              onClick={() => window.location.reload()}
            >
              Обновить
            </button>
            <Link to="/" className={btnPrimary + " inline-block"}>
              На главную
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
