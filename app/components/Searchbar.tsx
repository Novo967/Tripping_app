// app/components/Searchbar.tsx
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { app } from '../../firebaseConfig';

const GOOGLE_PLACES_API_KEY = 'AIzaSyCGB--Rhj7I5Ld28GV7zwc2Oe8OpjquqnI';
const db = getFirestore(app);
const { width: screenWidth } = Dimensions.get('window');

interface SearchResult {
    id: string;
    name: string;
    type: 'place' | 'user';
    location?: { latitude: number; longitude: number };
}

interface SearchbarProps {
    onSelectResult: (latitude: number, longitude: number) => void;
    results: SearchResult[];
    setResults: (results: SearchResult[]) => void;
    onFocus: () => void;
}

export default function Searchbar({ onSelectResult, results, setResults, onFocus }: SearchbarProps) {
    const [queryText, setQueryText] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { theme } = useTheme();

    const widthAnim = useRef(new Animated.Value(0)).current;

    const toggleSearch = () => {
        if (open) {
            Animated.timing(widthAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: false,
            }).start(() => setOpen(false));
        } else {
            setOpen(true);
            Animated.timing(widthAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: false,
            }).start();
        }
    };

    const handleSearch = useCallback(async (text: string) => {
        setQueryText(text);
        if (text.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);

        try {
            const userResults = await searchUsers(text);
            const placeResults = await searchPlaces(text);
            setResults([...userResults, ...placeResults]);
        } catch (error) {
            console.error('Error during search:', error);
            Alert.alert('שגיאה', 'אירעה שגיאה בחיפוש. נסה שוב מאוחר יותר.');
        } finally {
            setLoading(false);
        }
    }, [setResults]);

    const searchUsers = async (text: string): Promise<SearchResult[]> => {
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const users: SearchResult[] = [];
        const lowerCaseText = text.toLowerCase();

        userSnapshot.forEach(doc => {
            const data = doc.data();
            if (
                data.username &&
                data.username.toLowerCase().includes(lowerCaseText) &&
                data.latitude != null &&
                data.longitude != null
            ) {
                users.push({
                    id: doc.id,
                    name: data.username,
                    type: 'user',
                    location: { latitude: data.latitude, longitude: data.longitude },
                });
            }
        });
        return users;
    };

    const searchPlaces = async (text: string): Promise<SearchResult[]> => {
        const places: SearchResult[] = [];
        try {
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_PLACES_API_KEY}&language=he&components=country:il`
            );

            if (response.data.status === 'OK') {
                for (const prediction of response.data.predictions) {
                    const geocodeResponse = await axios.get(
                        `https://maps.googleapis.com/maps/api/geocode/json?place_id=${prediction.place_id}&key=${GOOGLE_PLACES_API_KEY}`
                    );

                    if (geocodeResponse.data.status === 'OK') {
                        const { lat, lng } = geocodeResponse.data.results[0].geometry.location;
                        places.push({
                            id: prediction.place_id,
                            name: prediction.description,
                            type: 'place',
                            location: { latitude: lat, longitude: lng },
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error searching Google Places:', error);
        }
        return places;
    };

    const handleResultPress = (result: SearchResult) => {
        if (result.location) {
            onSelectResult(result.location.latitude, result.location.longitude);
            setQueryText('');
            setResults([]);
            toggleSearch();
        }
    };

    const renderItem = ({ item }: { item: SearchResult }) => (
        <TouchableOpacity
            style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
            onPress={() => handleResultPress(item)}
        >
            <Text style={[styles.resultText, { color: theme.colors.text }]}>
                {item.name} ({item.type === 'user' ? 'משתמש' : 'מיקום'})
            </Text>
        </TouchableOpacity>
    );

    const animatedWidth = widthAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [52, screenWidth - 30], // מרוחב מלא פחות מרווחים
    });

    return (
        <View style={styles.wrapper}>
            <Animated.View style={[styles.container, { width: animatedWidth }]}>
                {open ? (
                    // מצב פתוח - מציג את תיבת החיפוש
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: theme.colors.background,
                                    color: theme.colors.text,
                                    borderColor: theme.colors.border,
                                },
                            ]}
                            placeholder="חיפוש מקום או משתמש..."
                            placeholderTextColor={theme.colors.text}
                            value={queryText}
                            onChangeText={handleSearch}
                            onFocus={onFocus}
                            textAlign="right"
                            autoFocus
                        />
                        <TouchableOpacity 
                            style={styles.closeButton} 
                            onPress={toggleSearch}
                        >
                            <Ionicons name="close" size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        {loading && (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            </View>
                        )}
                    </View>
                ) : (
                    // מצב סגור - מציג רק את כפתור החיפוש
                    <TouchableOpacity 
                        style={[styles.searchButton, { backgroundColor: theme.colors.primary }]} 
                        onPress={toggleSearch}
                    >
                        <Ionicons name="search" size={24} color="#fff" />
                    </TouchableOpacity>
                )}
            </Animated.View>
            
            {/* תוצאות החיפוש */}
            {results.length > 0 && queryText.length > 0 && open && (
                <View style={styles.resultsContainer}>
                    <FlatList
                        style={[
                            styles.resultsList,
                            { 
                                backgroundColor: theme.colors.background, 
                                borderColor: theme.colors.border,
                                width: screenWidth - 30, // רוחב מלא פחות מרווחים
                            },
                        ]}
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        keyboardShouldPersistTaps="handled"
                        maxToRenderPerBatch={10}
                        windowSize={5}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 55,
        right: 15,
        left: 15,
        zIndex: 10,
        alignItems: 'flex-end',
    },
    container: {
        borderRadius: 26,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    searchButton: {
        backgroundColor: '#3A8DFF',
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 52,
        backgroundColor: 'white',
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        fontSize: 16,
        marginRight: 8,
    },
    closeButton: {
        padding: 8,
    },
    loadingContainer: {
        position: 'absolute',
        right: 50,
        top: 16,
    },
    resultsContainer: {
        position: 'absolute',
        top: 60,
        right: 0,
        left: 0,
        zIndex: 999,
    },
    resultsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
        elevation: 5,
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
    },
    resultText: {
        fontSize: 16,
        textAlign: 'right',
        writingDirection: 'rtl'
    },
});