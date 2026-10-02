import { Component, type PropsWithChildren } from 'react';

import { StartupErrorScreen } from './StartupErrorScreen';

type Props = PropsWithChildren<{ onRetry: () => void }>;
type State = { failed: boolean };

export class DbErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  private handleRetry = () => {
    this.setState({ failed: false });
    this.props.onRetry();
  };

  render() {
    if (this.state.failed) {
      return <StartupErrorScreen onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
