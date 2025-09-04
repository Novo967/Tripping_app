import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Animated,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../../../firebaseConfig';
import { useTheme } from '../ThemeContext';

interface SettingsScreenProps {
    onEditBio: () => void;
    onDeleteAccount: () => void;
    onBlockUser: () => void;
    fadeAnim: Animated.Value;
}

export default function SettingsScreen({ 
    onEditBio, 
    onDeleteAccount, 
    onBlockUser,
    fadeAnim 
}: SettingsScreenProps) {
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();

    const fadeOutAndLogout = () => {
        console.log('--- Calling fadeOutAndLogout function ---');
        Alert.alert(
            'התנתקות',
            'האם אתה בטוח שברצונך להתנתק?',
            [
                {
                    text: 'ביטול',
                    style: 'cancel'
                },
                {
                    text: 'התנתק',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await auth.signOut();
                            console.log('--- User successfully logged out and navigated to login screen ---');
                            router.replace('/Authentication/login');
                        } catch (error) {
                            console.error('--- Logout failed: ', error);
                            Alert.alert('שגיאה', 'לא הצלחנו להתנתק');
                        }
                    }
                }
            ]
        );
    };

    const handleEditBio = () => {
        router.push({
            pathname: '/(tabs)/profile',
            params: { triggerAction: 'editBio' }
        });
    };

    const handleTermsOfService = () => {
        router.push('/ProfileServices/TermsOfServiceProfile');
    };

    const handleToggleTheme = () => {
        toggleTheme();
    };

    const handleBlockUser = () => {
        router.push({
            pathname: '/(tabs)/profile',
            params: { triggerAction: 'blockUser' }
        });
    };

    const handleDeleteAccount = () => {
        router.push({
            pathname: '/(tabs)/profile',
            params: { triggerAction: 'deleteAccount' }
        });
    };

    const settingsOptions = [
        {
            id: 'editBio',
            title: 'עריכת ביו',
            icon: 'create-outline',
            onPress: handleEditBio,
            color: theme.colors.text
        },
        {
            id: 'termsOfService',
            title: 'תנאי שימוש',
            icon: 'document-text-outline',
            onPress: handleTermsOfService,
            color: theme.colors.text
        },
        {
            id: 'themeToggle',
            title: theme.isDark ? 'מצב בהיר' : 'מצב כהה',
            icon: theme.isDark ? 'sunny' : 'moon',
            onPress: handleToggleTheme,
            color: theme.colors.text
        },
        {
            id: 'blockUser',
            title: 'חסום משתמש',
            icon: 'hand-right-outline',
            onPress: handleBlockUser,
            color: theme.colors.text
        },
        {
            id: 'logout',
            title: 'התנתקות',
            icon: 'log-out-outline',
            onPress: fadeOutAndLogout,
            color: '#FF3B30'
        },
        {
            id: 'deleteAccount',
            title: 'מחק חשבון',
            icon: 'trash-outline',
            onPress: handleDeleteAccount,
            color: '#FF3B30'
        }
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar 
                barStyle={theme.isDark ? 'light-content' : 'dark-content'} 
                backgroundColor={theme.colors.background} 
            />
            
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                <TouchableOpacity 
                    style={styles.backButton} 
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    הגדרות
                </Text>
                <View style={styles.placeholder} />
            </View>

            {/* Settings List */}
            <View style={styles.settingsContainer}>
                {settingsOptions.map((option, index) => (
                    <TouchableOpacity
                        key={option.id}
                        style={[
                            styles.settingItem,
                            { 
                                backgroundColor: theme.colors.surface,
                                borderBottomColor: theme.colors.border 
                            },
                            index === settingsOptions.length - 1 && styles.lastItem
                        ]}
                        onPress={option.onPress}
                        activeOpacity={0.7}
                    >
                        <View style={styles.settingContent}>
                            <View style={styles.settingInfo}>
                                <Ionicons 
                                    name={option.icon as any} 
                                    size={22} 
                                    color={option.color} 
                                />
                                <Text style={[styles.settingTitle, { color: option.color }]}>
                                    {option.title}
                                </Text>
                            </View>
                            <Ionicons 
                                name="chevron-back" 
                                size={18} 
                                color={theme.colors.textSecondary} 
                            />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    placeholder: {
        width: 40, // Same width as back button to center the title
    },
    settingsContainer: {
        flex: 1,
        paddingTop: 20,
    },
    settingItem: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    lastItem: {
        borderBottomWidth: 0,
    },
    settingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
        textAlign: 'right',
        flex: 1,
    },
});