import React from 'react';
import { View } from 'react-native';

import { captureException } from '@/lib/sentry';
import { C } from '@/lib/theme';

import { Body, Button, Title } from './ui';

/** A screen that crashes shows this instead of a blank page, and the error goes to Sentry. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center', gap: 16 }}>
        <Title>Something went wrong</Title>
        <Body>It’s been reported. Try again.</Body>
        <Button label="Try again" onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}
