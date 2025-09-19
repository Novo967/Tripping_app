// app/IndexServices/CreateEvent/styles.ts
import Constants from 'expo-constants';
import { Platform, StatusBar, StyleSheet } from 'react-native';

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: isDark ? '#121212' : '#f8f9fa'
    },
    header: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingTop: Platform.OS === 'android'
            ? (StatusBar.currentHeight ?? 24) + 10
            : Constants.statusBarHeight + 10,
        paddingBottom: 10,
        backgroundColor: isDark ? '#1E1E1E' : '#3A8DFF',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        color: isDark ? '#3A8DFF' : 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    scrollView: { 
        padding: 20 
    },
    map: { 
        height: 200, 
        borderRadius: 20, 
        overflow: 'hidden', 
        marginBottom: 15,
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? '#333' : 'transparent'
    },
    customMarker: { 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    locationContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: isDark ? '#1E1E1E' : 'white',
        padding: 12,
        marginVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#ddd',
    },
    locationInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        flexShrink: 1,
    },
    locationTextContainer: {
        flexShrink: 1,
    },
    locationText: {
        color: isDark ? '#FFFFFF' : '#333',
        textAlign: 'right',
        fontWeight: '600',
        fontSize: 16,
        flexShrink: 1,
    },
    cityText: {
        color: isDark ? '#AAAAAA' : '#666',
        textAlign: 'right',
        fontSize: 12,
        marginTop: 2,
        flexShrink: 1,
    },
    editLocationButton: {
        backgroundColor: isDark ? '#1A2A4A' : '#E8F0FE',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    editLocationButtonText: {
        color: '#3A8DFF',
        fontWeight: '600',
        fontSize: 14,
    },
    imagePickerContainer: {
        marginVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePickerButton: {
        width: '100%',
        height: 180,
        borderRadius: 20,
        backgroundColor: isDark ? '#1E1E1E' : '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#3A8DFF',
        borderStyle: 'dashed',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: '#3A8DFF',
        marginTop: 8,
        fontSize: 16,
        fontWeight: 'bold',
    },
    eventImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        backgroundColor: isDark ? '#1E1E1E' : 'white',
        borderRadius: 10,
        padding: 12,
        marginVertical: 8,
        color: isDark ? '#FFFFFF' : '#333',
        textAlign: 'right',
        fontSize: 16,
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#eee',
    },
    inputError: {
        borderColor: '#CF6679',
    },
    descriptionInput: {
        height: 100,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    typeSelector: {
        flexDirection: 'row',
        marginVertical: 15,
    },
    typeSelectorContent: {
        flexDirection: 'row',
        paddingHorizontal: 5,
    },
    typeButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: isDark ? '#1E1E1E' : 'white',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#ddd',
        minWidth: 80,
    },
    typeSelected: {
        backgroundColor: '#3A8DFF',
        borderColor: '#3A8DFF',
    },
    typeText: {
        marginRight: 8,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
        color: isDark ? '#FFFFFF' : '#333',
    },
    typeTextSelected: {
        color: 'white',
    },
    dateAndTimeContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginVertical: 15,
    },
    dateTimeButton: {
        flex: 1,
        backgroundColor: isDark ? '#1E1E1E' : 'white',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: isDark ? '#333' : '#eee',
    },
    timeButton: {
        marginRight: 10,
    },
    dateButtonContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    dateText: { 
        marginRight: 10, 
        fontSize: 16, 
        color: isDark ? '#FFFFFF' : '#333',
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    createButton: {
        backgroundColor: '#3A8DFF',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
        elevation: 3,
        shadowColor: '#3A8DFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    createButtonText: { 
        color: 'white',
        fontWeight: 'bold', 
        fontSize: 18 
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: isDark ? '#1E1E1E' : 'white',
        borderRadius: 15,
        margin: 20,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#333' : '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isDark ? '#FFFFFF' : '#333',
        textAlign: 'center',
        flex: 1,
    },
    modalButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        minWidth: 60,
    },
    modalButtonTextCancel: {
        color: isDark ? '#AAAAAA' : '#666',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalButtonTextConfirm: {
        color: '#3A8DFF',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    datePickerContainer: {
        paddingVertical: 20,
        paddingHorizontal: 10,
    },
    datePicker: {
        width: '100%',
        borderColor: '#3A8DFF',
        height: Platform.OS === 'ios' ? 180 : 'auto',
    },
});

// Export both light and dark styles
export const lightStyles = createStyles(false);
export const darkStyles = createStyles(true);

// Hook for theme detection
export const useTheme = () => {
    // You'll need to implement theme detection logic here
    // This could be from React Context, system preference, or user settings
    const isDark = false; // Replace with actual theme detection
    return {
        isDark,
        styles: isDark ? darkStyles : lightStyles
    };
};