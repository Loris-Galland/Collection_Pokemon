import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, type ScrollViewProps } from 'react-native';

// Leaves the next element visible under the field, usually the button that sends the form.
const DEFAULT_ROOM_UNDER_FIELD = 96;
// The focused field itself must stay visible, below the header of the screen.
const ROOM_ABOVE_FIELD = 96;

const RevealFieldContext = createContext<(() => void) | undefined>(undefined);

/** Lets a text field ask to be scrolled above the keyboard when it gets the focus. */
export function useRevealField() {
  return useContext(RevealFieldContext);
}

interface KeyboardScrollViewProps extends Omit<ScrollViewProps, 'onScroll' | 'scrollEventThrottle' | 'onContentSizeChange'> {
  /** Height to keep visible under the focused field, for a form whose next fields should show too. */
  roomUnderField?: number;
}

/** Scrollable screen whose focused text field stays above the keyboard. */
export function KeyboardScrollView({
  contentContainerStyle,
  children,
  roomUnderField = DEFAULT_ROOM_UNDER_FIELD,
  ...rest
}: KeyboardScrollViewProps) {
  const scrollView = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | undefined>(undefined);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const revealFocusedField = useCallback(() => {
    const top = keyboardTop.current;
    if (top === undefined) return;
    TextInput.State.currentlyFocusedInput()?.measureInWindow((_x, y, _width, height) => {
      const distance = Math.min(y + height + roomUnderField - top, y - ROOM_ABOVE_FIELD);
      if (distance > 0) scrollView.current?.scrollTo({ y: scrollY.current + distance, animated: true });
    });
  }, [roomUnderField]);

  useEffect(() => {
    const showing = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hiding = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = undefined;
      setKeyboardHeight(0);
    });
    return () => {
      showing.remove();
      hiding.remove();
    };
  }, []);

  return (
    <RevealFieldContext.Provider value={revealFocusedField}>
      <ScrollView
        ref={scrollView}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={(event) => {
          scrollY.current = event.nativeEvent.contentOffset.y;
        }}
        // The room under the content must exist before the screen can scroll into it.
        onContentSizeChange={revealFocusedField}
        contentContainerStyle={[contentContainerStyle, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
        {...rest}>
        {children}
      </ScrollView>
    </RevealFieldContext.Provider>
  );
}
