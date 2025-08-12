// app/ProfileServices/bio.tsx - Enhanced Version with Responsive Keyboard
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useTheme } from '../ProfileServices/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  bio: string;
  isEditing: boolean;
  onChange: (bio: string) => void;
  onSave: (newBio: string) => void;
  onEditToggle: () => void;
};

export default function Bio({ bio, isEditing, onChange, onSave, onEditToggle }: Props) {
  const { theme } = useTheme();
  const [characterCount, setCharacterCount] = useState(bio.length);
  const [tempBio, setTempBio] = useState(bio);
  const animatedHeight = useRef(new Animated.Value(isEditing ? 120 : 60)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const textInputRef = useRef<TextInput>(null);
  const [isSaving, setIsSaving] = useState(false);

  // הגדרות חדשות - מינימום 20 תווים במקום מקסימום 150
  const maxLength = 150;
  const minLength = 20;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;
  const isUnderMinimum = characterCount < minLength;

  // אפקט לטיפול בשינוי מצב העריכה
  React.useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isEditing ? 120 : 60,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // אם נכנסים למצב עריכה, ממקדים את שדה הקלט
      if (isEditing) {
        textInputRef.current?.focus();
      }
    });
    // עדכון tempBio ו characterCount כאשר ה-bio המקורי משתנה
    setTempBio(bio);
    setCharacterCount(bio.length);
  }, [isEditing, bio]);

  // Handle keyboard dismiss when tapping outside (Memoized for performance)
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleBioChange = useCallback((text: string) => {
    setTempBio(text);
    setCharacterCount(text.length);
    onChange(text);
  }, [onChange]);

  const handleSave = useCallback(async () => {
    // בדיקה אם יש פחות מ-20 תווים או יותר ממקסימום
    if (isOverLimit || isUnderMinimum || isSaving) {
      if (isUnderMinimum) {
        Alert.alert("שגיאה", `הביוגרפיה חייבת להכיל לפחות ${minLength} תווים`);
      }
      return;
    }

    setIsSaving(true);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      Keyboard.dismiss();

      try {
        await onSave(tempBio);
      } catch (error) {
        console.error("Failed to save bio:", error);
        Alert.alert("שגיאה", "אירעה שגיאה בשמירת הביוגרפיה. אנא נסה שוב.");
      } finally {
        setIsSaving(false);
      }
    });
  }, [isOverLimit, isUnderMinimum, onSave, tempBio, fadeAnim, isSaving, minLength]);

  const handleCancel = useCallback(() => {
    setTempBio(bio);
    setCharacterCount(bio.length);
    onChange(bio);
    Keyboard.dismiss();
    onEditToggle();
  }, [bio, onChange, onEditToggle]);

  // פונקציה לטיפול בלחיצה על הביו - רק במצב שאין ביו
  const handleBioPress = useCallback(() => {
    // רק אם אין ביו, מתחילים עריכה
    if (!bio || bio.trim() === '') {
      onEditToggle();
    }
  }, [bio, onEditToggle]);

  const bioContent = (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          opacity: fadeAnim,
          // מסגרת כחולה דקה
          borderWidth: 1,
          borderColor: theme.colors.primary + '30', // שקיפות 30%
        }
      ]}
    >
      <LinearGradient
        colors={[theme.colors.primary + '10', 'transparent']}
        style={styles.gradientBackground}
      />

      {isEditing ? (
        <View style={styles.editingContainer}>
          <View style={styles.inputHeader}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              ביוגרפיה
            </Text>
            <View style={styles.characterCounter}>
              <Text
                style={[
                  styles.counterText,
                  {
                    color: isOverLimit
                      ? theme.colors.error
                      : isUnderMinimum
                        ? theme.colors.warning
                        : isNearLimit
                          ? theme.colors.warning
                          : theme.colors.textSecondary
                  }
                ]}
              >
                {characterCount}/{maxLength} (מינימום {minLength})
              </Text>
            </View>
          </View>

          <Animated.View style={{ height: animatedHeight }}>
            <TextInput
              ref={textInputRef}
              style={[
                styles.bioInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderColor: isOverLimit
                    ? theme.colors.error
                    : isUnderMinimum
                      ? theme.colors.warning
                      : theme.colors.border,
                }
              ]}
              value={tempBio}
              onChangeText={handleBioChange}
              placeholder="ספר לנו קצת על עצמך... מה אתה אוהב? איפה אתה גר? מה המקצוע שלך?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={maxLength}
              textAlignVertical="top"
              textAlign="right"
              autoFocus
              blurOnSubmit={false}
              returnKeyType="done"
              onSubmitEditing={dismissKeyboard}
              accessibilityLabel="שדה עריכת ביוגרפיה"
              accessibilityHint={`ניתן להזין בין ${minLength} ל-${maxLength} תווים. נכון לעכשיו, ישנם ${characterCount} תווים.`}
            />
          </Animated.View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              accessibilityLabel="ביטול עריכה"
            >
              <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                ביטול
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                {
                  backgroundColor: isOverLimit || isUnderMinimum || isSaving
                    ? theme.colors.textSecondary
                    : theme.colors.primary
                }
              ]}
              disabled={isOverLimit || isUnderMinimum || isSaving}
              accessibilityLabel={isSaving ? "שומר..." : "שמור שינויים בביוגרפיה"}
            >
              {isSaving ? (
                <Text style={styles.saveButtonText}>שומר...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="white" />
                  <Text style={styles.saveButtonText}>שמור</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleBioPress}
          style={styles.displayContainer}
          accessibilityLabel={bio ? "הצג ביוגרפיה" : "הוסף ביוגרפיה"}
          disabled={!!bio && bio.trim() !== ''} // מבטל לחיצה אם יש ביו
        >
          <View style={styles.bioContent}>
            {bio && bio.trim() !== '' ? (
              <>
                <Text style={[styles.bioText, { color: theme.colors.text }]}>
                  {bio}
                </Text>
                <View style={styles.bioMeta}>
                  <Text style={[styles.bioLength, { color: theme.colors.textSecondary }]}>
                    {bio.length} תווים
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyBio}>
                <Ionicons name="create-outline" size={20} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyBioText, { color: theme.colors.textSecondary }]}>
                  הוסף תיאור אישי... (לחץ כאן)
                </Text>
              </View>
            )}
          </View>
          {/* הוסרה האייקון של העיפרון */}
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (isEditing) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.touchableContainer}>
            {bioContent}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  return bioContent;
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  touchableContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  editingContainer: {
    padding: 16,
  },
  inputHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  characterCounter: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bioInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'system' : 'Roboto',
    minHeight: 60,
    maxHeight: 180,
  },
  actionButtons: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },
  saveButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  displayContainer: {
    padding: 16,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  bioContent: {
    flex: 1,
  },
  bioText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right',
    marginBottom: 8,
  },
  bioMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  bioLength: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBio: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  emptyBioText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  // הוסר editIndicator style כי לא צריך יותר את העיפרון
});