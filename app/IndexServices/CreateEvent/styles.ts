// app/IndexServices/CreateEvent/styles.ts
import Constants from 'expo-constants';
import { Platform, StatusBar, StyleSheet } from 'react-native';

export const createStyles = (theme: any) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: theme.colors.background
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
        backgroundColor: theme.colors.primary,
        elevation: 5,
        shadowColor: theme.colors.shadow,
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
        color: theme.colors.background,
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
        borderWidth: 1,
        borderColor: theme.colors.border
    },
    customMarker: { 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    locationContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        padding: 12,
        marginVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
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
        color: theme.colors.text,
        textAlign: 'right',
        fontWeight: '600',
        fontSize: 16,
        flexShrink: 1,
    },
    cityText: {
        color: theme.colors.textSecondary,
        textAlign: 'right',
        fontSize: 12,
        marginTop: 2,
        flexShrink: 1,
    },
    editLocationButton: {
        backgroundColor: theme.isDark ? 'rgba(58, 141, 255, 0.2)' : 'rgba(58, 141, 255, 0.1)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    editLocationButtonText: {
        color: theme.colors.primary,
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
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderStyle: 'dashed',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: theme.colors.primary,
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
        backgroundColor: theme.colors.overlay,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        padding: 12,
        marginVertical: 8,
        color: theme.colors.text,
        textAlign: 'right',
        fontSize: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    inputError: {
        borderColor: theme.colors.error,
    },
    descriptionInput: {
        height: 100,
        marginBottom: 20,
        textAlignVertical: 'top',
    },
    typeSelector: {
        flexDirection: 'row',
        marginVertical: 8,
    },
    typeSelectorContent: {
        flexDirection: 'row-reverse',
        paddingHorizontal: 5,

    },
    typeButton: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 20,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minWidth: 80,
    },
    typeSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    typeText: {
        marginRight: 8,
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'right',
        color: theme.colors.text,
    },
    typeTextSelected: {
        color: theme.isDark ? theme.colors.text : '#FFFFFF',
    },
    dateAndTimeContainer: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginVertical: 15,
    },
    dateTimeButton: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
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
        color: theme.colors.text,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    createButton: {
        backgroundColor: theme.colors.primary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 30,
        elevation: 3,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    createButtonText: { 
        color: theme.isDark ? theme.colors.text : '#FFFFFF',
        fontWeight: 'bold', 
        fontSize: 18 
    },
    createButtonDisabled: {
        opacity: 0.6,
    },
    modalBackground: {
        flex: 1,
        backgroundColor: theme.colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: theme.colors.surface,
        borderRadius: 15,
        margin: 20,
        width: '90%',
        maxWidth: 400,
        shadowColor: theme.colors.shadow,
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
        borderBottomColor: theme.colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        flex: 1,
    },
    modalButton: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        minWidth: 60,
    },
    modalButtonTextCancel: {
        color: theme.colors.textSecondary,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalButtonTextConfirm: {
        color: theme.colors.primary,
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
        borderColor: theme.colors.primary,
        height: Platform.OS === 'ios' ? 180 : 'auto',
    },
});