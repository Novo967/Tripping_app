import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Animated,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
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
                            router.replace('/Authentication/login');
                        } catch (error) {
                            console.error('Logout failed: ', error);
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

    const handleBack = () => {
        router.push('/(tabs)/profile');
    };

    const settingsSections = [
        {
            title: 'שימוש באפליקציה',
            options: [
                {
                    id: 'editBio',
                    title: 'עריכת פרופיל',
                    icon: 'create-outline',
                    onPress: handleEditBio,
                    color: theme.colors.text,
                    isSwitch: false,
                },
                {
                    id: 'themeToggle',
                    title: 'מצב כהה',
                    icon: 'moon',
                    onPress: toggleTheme,
                    color: theme.colors.text,
                    isSwitch: true,
                }
            ]
        },
        {
            title: 'פרטיות',
            options: [
                {
                    id: 'termsOfService',
                    title: 'תנאי שימוש',
                    icon: 'document-text-outline',
                    onPress: handleTermsOfService,
                    color: theme.colors.text,
                    isSwitch: false,
                },
                {
                    id: 'blockUser',
                    title: 'חסום משתמש',
                    icon: 'hand-right-outline',
                    onPress: handleBlockUser,
                    color: theme.colors.text,
                    isSwitch: false,
                }
            ]
        },
        {
            title: 'ניהול חשבון',
            options: [
                {
                    id: 'logout',
                    title: 'התנתקות',
                    icon: 'log-out-outline',
                    onPress: fadeOutAndLogout,
                    color: '#FF3B30',
                    isSwitch: false,
                },
                {
                    id: 'deleteAccount',
                    title: 'מחק חשבון',
                    icon: 'trash-outline',
                    onPress: handleDeleteAccount,
                    color: '#FF3B30',
                    isSwitch: false,
                }
            ]
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
                    onPress={handleBack}
                >
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: '#0095f6' }]}>
                    הגדרות
                </Text>
                <View style={styles.placeholder} />
            </View>

            {/* Settings List */}
            <View style={styles.settingsContainer}>
                <View style={[styles.sectionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    {settingsSections.map((section, sectionIndex) => (
                        <View key={section.title}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                                {section.title}
                            </Text>
                            {section.options.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={styles.settingItem}
                                    onPress={option.onPress}
                                    activeOpacity={option.isSwitch ? 1 : 0.7} // Disable opacity for switch
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
                                        {option.isSwitch ? (
                                            <Switch
                                                trackColor={{ false: theme.colors.border, true: '#0095f6' }}
                                                thumbColor={theme.isDark ? '#f4f3f4' : '#f4f3f4'}
                                                ios_backgroundColor={theme.colors.border}
                                                onValueChange={toggleTheme}
                                                value={theme.isDark}
                                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],marginLeft: -10 }}
                                            />
                                        ) : (
                                            <Ionicons
                                                name="chevron-back"
                                                size={18}
                                                color={theme.colors.textSecondary}
                                            />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {/* Add a separator between sections if it's not the last section */}
                            {sectionIndex < settingsSections.length - 1 && (
                                <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                            )}
                        </View>
                    ))}
                </View>
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
        width: 40,
    },
    settingsContainer: {
        flex: 1,
        paddingTop: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '500',
        paddingHorizontal: 16,
        paddingVertical: 10,
        textAlign: 'right',
    },
    sectionContainer: {
        marginHorizontal: 16,
        borderRadius: 10,
        overflow: 'hidden',
        paddingVertical: 12, // Increased vertical padding
    },
    settingItem: {
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    settingContent: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '400',
        marginRight: 12,
    },
    separator: {
        height: 1,
        marginVertical: 5,
        marginHorizontal: 12,
    }
});