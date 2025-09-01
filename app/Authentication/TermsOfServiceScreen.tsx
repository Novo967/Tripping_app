import { router } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>תנאי שימוש ופרטיות</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}> {/* שינוי כאן: router.back() */}
            <Text style={styles.backButtonText}>חזור</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.appTitle}>Triping</Text>
            <Text style={styles.appSubtitle}>אפליקציית הטיולים שלכם</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>תנאי שימוש</Text>
            <Text style={styles.lastUpdated}>עדכון אחרון: דצמבר 2024</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>1. קבלת התנאים</Text>
            <Text style={styles.sectionText}>
              על ידי הרשמה לאפליקציית Triping ושימוש בשירותיה, אתם מסכימים לתנאים אלה.
              אם אינכם מסכימים לתנאים, אנא אל תשתמשו באפליקציה.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>2. תיאור השירות</Text>
            <Text style={styles.sectionText}>
              Triping היא אפליקציה החיבור בין מטיילים לאנשי מקום, המאפשרת לכם:
              {'\n'}• למצוא חברים לטיולים ופעילויות
              {'\n'}• לחלוק חוויות ומקומות מעניינים
              {'\n'}• לקבל המלצות מקומיות
              {'\n'}• לתכנן טיולים משותפים
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>3. רישום וחשבון משתמש</Text>
            <Text style={styles.sectionText}>
              • עליכם לספק מידע מדויק ועדכני בעת הרישום
              {'\n'}• אתם אחראים לשמירת הסיסמה שלכם
              {'\n'}• עליכם להיות בני 13 לפחות לשימוש באפליקציה
              {'\n'}• חשבון אחד למשתמש בלבד
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>4. שימוש באפליקציה</Text>
            <Text style={styles.sectionText}>
              אתם מתחייבים:
              {'\n'}• לא לפרסם תוכן פוגעני, בלתי חוקי או לא הולם
              {'\n'}• לכבד משתמשים אחרים
              {'\n'}• לא לשתף מידע אישי של אחרים ללא הסכמה
              {'\n'}• לדווח על התנהגות בלתי הולמת
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>5. מדיניות פרטיות</Text>
            <Text style={styles.sectionText}>
              אנו אוספים ומשתמשים במידע הבא:
              {'\n'}• מידע הרישום (אימייל, שם משתמש)
              {'\n'}• מיקום גיאוגרפי (לשיפור השירות)
              {'\n'}• פעילות באפליקציה
              {'\n'}• המידע שלכם מוגן ולא יועבר לצדדים שלישיים ללא הסכמתכם
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>6. בטיחות ואחריות</Text>
            <Text style={styles.sectionText}>
              • אתם אחראים לבטיחותכם האישית בעת מפגשים
              {'\n'}• המפגשים מתבצעים על אחריותכם הבלעדית
              {'\n'}• ההכרויות דרך האפליקציה מתבצעות בסיכונכם
              {'\n'}• אנו ממליצים להיפגש במקומות ציבוריים
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>7. זכויות יוצרים</Text>
            <Text style={styles.sectionText}>
              • האפליקציה ותכניה מוגנים בזכויות יוצרים
              {'\n'}• התוכן שאתם מפרסמים נשאר בבעלותכם
              {'\n'}• אתם מעניקים לנו רישיון להציג את התוכן באפליקציה
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>8. הפסקת שירות</Text>
            <Text style={styles.sectionText}>
              אנו שומרים על הזכות:
              {'\n'}• לחסום או למחוק חשבונות המפרים את התנאים  
              {'\n'}• לשנות או להפסיק את השירות בכל עת
              {'\n'}• לעדכן את התנאים (עם הודעה מוקדמת)
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>9. יצירת קשר</Text>
            <Text style={styles.sectionText}>
              לשאלות או בקשות בנוגע לתנאים אלה:
              {'\n'}• אימייל: support@triping.app
              {'\n'}• טלפון: 03-1234567
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>10. שינויים בתנאים</Text>
            <Text style={styles.sectionText}>
              אנו עשויים לעדכן תנאים אלה מעת לעת. השימוש המתמשך באפליקציה
              לאחר שינויים מהווה הסכמה לתנאים החדשים.
            </Text>
          </View>

          <View style={styles.acceptSection}>
            <Text style={styles.acceptText}>
              בלחיצה על "אני מסכים/ה" במסך ההרשמה, אתם מאשרים שקראתם והבנתם
              את התנאים ומסכימים להם במלואם.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ... שאר הקוד של styles ...
const PRIMARY_COLOR = '#3A8DFF';
const BACKGROUND_COLOR = '#FAFBFC';
const TEXT_COLOR = '#1A1A1A';
const GRAY_COLOR = '#6B7280';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: -12,
  },
  backButtonText: {
    fontSize: 16,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    writingDirection: 'rtl',
    transform: [{ scaleX: -1 }],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_COLOR,
    textAlign: 'center',
    flex: 1,
    marginLeft: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: GRAY_COLOR,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_COLOR,
    textAlign: 'center',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: GRAY_COLOR,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    textAlign: 'right',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: TEXT_COLOR,
    textAlign: 'right',
    lineHeight: 24,
    writingDirection: 'rtl',
  },
  acceptSection: {
    backgroundColor: '#FFF7ED',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    marginTop: 20,
    marginBottom: 40,
  },
  acceptText: {
    fontSize: 16,
    color: '#9A3412',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '600',
  },
});