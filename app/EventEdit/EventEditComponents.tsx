import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../ThemeContext';

// קבועים
const eventTypesArray = ['trip', 'party', 'attraction', 'food', 'nightlife', 'beach', 'sport', 'other'];

const typeLabels: Record<string, string> = {
    'trip': 'טיול',
    'party': 'מסיבה',
    'attraction': 'אטרקציה',
    'food': 'אוכל',
    'nightlife': 'חיי לילה',
    'beach': 'ים/בריכה',
    'sport': 'ספורט',
    'other': 'אחר',
};

// יצירת מפה של שמות אייקונים ספציפיים בלבד
const iconNames = {
    'trip': 'trail-sign-outline',
    'party': 'musical-notes-outline',
    'attraction': 'star-outline',
    'food': 'restaurant-outline',
    'nightlife': 'wine-outline',
    'beach': 'sunny-outline',
    'sport': 'barbell-outline',
    'other': 'ellipsis-horizontal-outline',
} as const; // השתמש ב-'as const' כדי ליצור Union Type מדויק

// 1. הגדרת טיפוס עבור שמות האייקונים של Ionicons
// הטיפוסים האפשריים יהיו הערכים בתוך ה-Object iconNames
type EventIconName = typeof iconNames[keyof typeof iconNames];

// 2. הפונקציה getEventIcon חוזרת כעת עם הטיפוס הספציפי שהגדרנו
const getEventIcon = (type: string): EventIconName => {
    return iconNames[type as keyof typeof iconNames] || iconNames.other;
};

// רכיב לבחירת סוג אירוע
interface TypeSelectorProps {
    selectedType: string;
    onSelect: (type: string) => void;
}

export const TypeSelector: React.FC<TypeSelectorProps> = ({ selectedType, onSelect }) => {
    const { theme } = useTheme();

    return (
        <View style={[styles.inputGroup, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}>
            <Text style={[styles.label, { color: theme.isDark ? '#BDC3C7' : '#2C3E50' }]}>סוג האירוע</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.typeSelector}
                contentContainerStyle={styles.typeSelectorContent}
            >
                {eventTypesArray.map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.typeButton,
                            { borderColor: theme.isDark ? '#3E506B' : '#BDC3C7' },
                            selectedType === type && [styles.typeSelected, { backgroundColor: '#3A8DFF' }]
                        ]}
                        onPress={() => onSelect(type)}
                    >
                        <Text
                            style={[
                                styles.typeText,
                                { color: theme.isDark ? '#E0E0E0' : '#2C3E50' },
                                selectedType === type && styles.typeTextSelected
                            ]}
                        >
                            {typeLabels[type]}
                        </Text>
                        <Ionicons
                            name={getEventIcon(type)}
                            size={16}
                            color={selectedType === type ? '#FFFFFF' : '#3A8DFF'}
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// רכיב של חלון קופץ לבחירת תאריך/שעה
interface DateTimePickerModalProps {
    mode: 'date' | 'time';
    onConfirm: () => void;
    onCancel: () => void;
    onDateChange: (event: any, date?: Date) => void;
    initialDate: Date;
}

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
    mode,
    onConfirm,
    onCancel,
    onDateChange,
    initialDate,
}) => {
    const { theme } = useTheme();

    if (Platform.OS === 'android') {
        return (
            <DateTimePicker
                value={initialDate}
                mode={mode}
                onChange={onDateChange}
                minimumDate={new Date()}
                display="default"
            />
        );
    }

    return (
        <Modal visible={true} transparent animationType="slide">
            <View style={styles.modalBackground}>
                <View style={[styles.modalContainer, { backgroundColor: theme.isDark ? '#2C3946' : '#FFFFFF' }]}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={onCancel}>
                            <Text style={[styles.modalButtonCancel, { color: '#FF6B6B' }]}>ביטול</Text>
                        </TouchableOpacity>
                        <Text style={[styles.modalTitle, { color: theme.isDark ? '#E0E0E0' : '#333' }]}>
                            בחר {mode === 'date' ? 'תאריך' : 'שעה'}
                        </Text>
                        <TouchableOpacity onPress={onConfirm}>
                            <Text style={[styles.modalButtonConfirm, { color: '#3A8DFF' }]}>אישור</Text>
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker
                        value={initialDate}
                        mode={mode}
                        onChange={onDateChange}
                        minimumDate={new Date()}
                        display="spinner"
                        themeVariant={theme.isDark ? "dark" : "light"}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: 20,
        borderRadius: 12,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'right',
    },
    typeSelector: {
        marginTop: 5,
    },
    typeSelectorContent: {
        paddingVertical: 5,
        gap: 10,
    },
    typeButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
    },
    typeSelected: {
        borderColor: 'transparent',
    },
    typeText: {
        fontSize: 14,
        fontWeight: '500',
    },
    typeTextSelected: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        borderRadius: 12,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalButtonCancel: {
        fontSize: 16,
        fontWeight: '500',
    },
    modalButtonConfirm: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});