// app/components/Searchbar.tsx
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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

    const widthAnim = useRef(new Animated.Value(0)).current; // אנימציה לפתיחה/סגירה

    const toggleSearch = () => {
        if (open) {
            // סוגר
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
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.wrapper}>
            {/* כפתור חיפוש */}
            <TouchableOpacity style={[styles.searchButton, { backgroundColor: theme.colors.primary }]} onPress={toggleSearch}>
                <Ionicons name="search" size={24} color="#fff" />
            </TouchableOpacity>

            {/* תיבת חיפוש נפתחת */}
            {open && (
                <Animated.View style={[styles.container, { width: animatedWidth }]}>
                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.background,
                                color: theme.colors.text,
                                borderColor: theme.colors.border,
                                textAlign: 'right', // טקסט בצד ימין
                            },
                        ]}
                        placeholder="חיפוש מקום או משתמש..."
                        placeholderTextColor={theme.colors.text}
                        value={queryText}
                        onChangeText={handleSearch}
                        onFocus={onFocus}
                    />
                    {loading && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        </View>
                    )}
                    {results.length > 0 && queryText.length > 0 && (
                        <FlatList
                            style={[
                                styles.resultsList,
                                { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
                            ]}
                            data={results}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </Animated.View>
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
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    searchButton: {
        backgroundColor: '#3A8DFF',
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#3A8DFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    container: {
        position: 'absolute',
        right:5,
        marginHorizontal: 12,
        marginRight: 50,
        flex: 1,
        top: 5,
        borderRadius: 10,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    input: {
        height: 50,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        fontSize: 16,
    },
    loadingContainer: {
        position: 'absolute',
        right: 20,
        top: 15,
    },
    resultsList: {
        maxHeight: 200,
        borderWidth: 1,
        borderRadius: 10,
        marginTop: 5,
        width: '100%',         // יתפוס את כל רוחב המסך
        alignSelf: 'stretch',  // יוודא שזה באמת נמתח
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
        width: '100%',         // כל פריט ברוחב מלא
    },
    resultText: {
        fontSize: 16,
        textAlign: 'right',     // טקסט מימין לשמאל
        writingDirection: 'rtl' // כיוון כתיבה RTL
    },
});
