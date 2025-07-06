// app/ProfileServices/bio.tsx - Enhanced Version with Responsive Keyboard
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react'; // הוספת useCallback לביצועים
import {
  Alert // הוספת Alert עבור הודעות שגיאה אפשריות
  ,

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
  onSave: (newBio: string) => void; // שינוי כאן: העברת ה-newBio לפונקציית השמירה
  onEditToggle: () => void;
};

export default function Bio({ bio, isEditing, onChange, onSave, onEditToggle }: Props) {
  const { theme } = useTheme();
  const [characterCount, setCharacterCount] = useState(bio.length);
  const [tempBio, setTempBio] = useState(bio);
  const animatedHeight = useRef(new Animated.Value(isEditing ? 120 : 60)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const textInputRef = useRef<TextInput>(null);
  const [isSaving, setIsSaving] = useState(false); // מצב חדש לניהול אנימציית שמירה

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
  }, [isEditing, bio]); // הוספת bio כתלות כדי לעדכן אם הוא משתנה חיצונית

  // Handle keyboard dismiss when tapping outside (Memoized for performance)
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleBioChange = useCallback((text: string) => {
    setTempBio(text);
    setCharacterCount(text.length);
    onChange(text);
  }, [onChange]); // הוספת onChange כתלות

  const handleSave = useCallback(async () => { // הוספת async לטיפול ב-promise
    if (isOverLimit || isSaving) { // מונעים לחיצות כפולות ושמירה מעבר למגבלה
      return;
    }

    setIsSaving(true); // מתחילים את מצב השמירה

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
    ]).start(async () => { // השתמשו ב-callback של אנימציה כדי לוודא שהיא הסתיימה לפני שמירה
      Keyboard.dismiss(); // סוגרים את המקלדת לפני השמירה

      try {
        await onSave(tempBio); // קוראים לפונקציית השמירה עם ה-bio הזמני
        // אופציונלי: הציגו הודעת הצלחה קצרה
        // Toast.show({ text1: 'ביוגרפיה נשמרה!', type: 'success' }); 
      } catch (error) {
        console.error("Failed to save bio:", error);
        Alert.alert("שגיאה", "אירעה שגיאה בשמירת הביוגרפיה. אנא נסה שוב.");
      } finally {
        setIsSaving(false); // מסיימים את מצב השמירה
      }
    });
  }, [isOverLimit, onSave, tempBio, fadeAnim, isSaving]); // הוספת תלויות

  const handleCancel = useCallback(() => {
    setTempBio(bio); // מחזירים את ה-bio למצב המקורי
    setCharacterCount(bio.length);
    onChange(bio); // מעדכנים גם את ה-prop החיצוני
    Keyboard.dismiss(); // סוגרים את המקלדת
    onEditToggle(); // מחזירים למצב תצוגה
  }, [bio, onChange, onEditToggle]); // הוספת תלויות

  const maxLength = 150;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  const bioContent = (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          opacity: fadeAnim,
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
                      : isNearLimit
                        ? theme.colors.warning
                        : theme.colors.textSecondary
                  }
                ]}
              >
                {characterCount}/{maxLength}
              </Text>
            </View>
          </View>

          {/* עוטפים את ה-TextInput ב-Animated.View עבור אנימציית גובה */}
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
                    : theme.colors.border,
                }
              ]}
              value={tempBio}
              onChangeText={handleBioChange}
              placeholder="ספר לנו קצת על עצמך... מה אתה אוהב? איפה אתה גר? מה המקצוע שלך?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={maxLength}
              textAlignVertical="top" // חשוב עבור multiline TextInput
              textAlign="right"
              autoFocus // שדה קלט יקבל מיקוד אוטומטית במצב עריכה
              blurOnSubmit={false} // מאפשר Enter לשורה חדשה ב-multiline, סגירה עם "Done" במקלדת תטופל ע"י onSubmitEditing
              returnKeyType="done" // מציג כפתור "Done" במקלדת
              onSubmitEditing={dismissKeyboard} // סוגר את המקלדת בלחיצה על "Done"
              // לנגישות טובה יותר
              accessibilityLabel="שדה עריכת ביוגרפיה"
              accessibilityHint={`ניתן להזין עד ${maxLength} תווים. נכון לעכשיו, ישנם ${characterCount} תווים.`}
            />
          </Animated.View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.cancelButton, { borderColor: theme.colors.border }]}
              accessibilityLabel="ביטול עריכה" // לנגישות
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
                  backgroundColor: isOverLimit || isSaving // הוספת isSaving כדי למנוע לחיצה בזמן שמירה
                    ? theme.colors.textSecondary // צבע אפור כשהוא מושבת או נשמר
                    : theme.colors.primary
                }
              ]}
              disabled={isOverLimit || isSaving} // השבתה גם בזמן שמירה
              accessibilityLabel={isSaving ? "שומר..." : "שמור שינויים בביוגרפיה"} // לנגישות
            >
              {isSaving ? (
                <Text style={styles.saveButtonText}>שומר...</Text> // במקום אייקון בזמן שמירה
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
          onPress={onEditToggle}
          style={styles.displayContainer}
          accessibilityLabel={bio ? "הצג ביוגרפיה, לחץ לעריכה" : "הוסף ביוגרפיה"} // לנגישות
        >
          <View style={styles.bioContent}>
            {bio ? (
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
                  הוסף תיאור אישי...
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.editIndicator, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="pencil" size={14} color="white" />
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  // Wrap with KeyboardAvoidingView and TouchableWithoutFeedback when editing
  if (isEditing) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // 'padding' ל-iOS, 'height' לאנדרואיד
        style={styles.keyboardAvoidingView}
        // keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // אפשר לכוונן אם יש בעיות עם ריפוד עליון
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          {/* חשוב לעטוף ב-View נוסף כדי שה-TouchableWithoutFeedback יתפוס את כל השטח */}
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
    flex: 1, // חשוב שיתפוס את כל השטח הזמין
  },
  touchableContainer: {
    flex: 1, // חשוב שיתפוס את כל השטח הזמין כדי ש-TouchableWithoutFeedback יעבוד
    justifyContent: 'flex-end', // יישור תוכן לתחתית כדי שה-TextInput יהיה מעל המקלדת
  },
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2, // צל עבור אנדרואיד
    shadowColor: '#000', // צל עבור iOS
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
    // flex: 1, // במקרה של Animated.View, עדיף לתת גובה קבוע או אנימטיבי
    fontFamily: Platform.OS === 'ios' ? 'system' : 'Roboto',
    minHeight: 60, // גובה מינימלי ל-TextInput
    maxHeight: 180, // גובה מקסימלי, כדי למנוע מהשדה להיות ענק
  },
  actionButtons: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8, // שימוש ב-gap לרווח בין כפתורים (React Native 0.71+)
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
  editIndicator: {
    padding: 8,
    borderRadius: 16,
    marginLeft: 12,
  },
});