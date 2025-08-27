// app/components/Searchbar.tsx
import axios from 'axios';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../../app/ProfileServices/ThemeContext';
import { app } from '../../firebaseConfig';

const GOOGLE_PLACES_API_KEY = 'AIzaSyCGB--Rhj7I5Ld28GV7zwc2Oe8OpjquqnI'; // ⚠️ REMEMBER TO REPLACE WITH YOUR KEY

const db = getFirestore(app);

interface SearchResult {
    id: string;
    name: string;
    type: 'place' | 'user';
    location?: { latitude: number; longitude: number };
}

interface SearchbarProps {
    onSelectResult: (latitude: number, longitude: number) => void;
    // עכשיו Searchbar מקבל את התוצאות ואת הפונקציה לשינוי התוצאות כ-props
    results: SearchResult[];
    setResults: (results: SearchResult[]) => void;
    onFocus: () => void;
}

export default function Searchbar({ onSelectResult, results, setResults, onFocus }: SearchbarProps) {
    const [queryText, setQueryText] = useState('');
    const [loading, setLoading] = useState(false);
    const { theme } = useTheme();

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
            if (data.username && data.username.toLowerCase().includes(lowerCaseText) && data.latitude != null && data.longitude != null) {
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
            setResults([]); // עדיין מנקה את התוצאות אחרי בחירה
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

    return (
        <View style={styles.container}>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: theme.colors.card,
                        color: theme.colors.text,
                        borderColor: theme.colors.border,
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
                    style={[styles.resultsList, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                    data={results}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    keyboardShouldPersistTaps="handled"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        backgroundColor: '#FFF',
        top: 55, // Adjust this value to position the search bar correctly
        left: 10,
        right: 10,
        zIndex: 100,
        borderRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    input: {
        height: 50,
        paddingHorizontal: 15,
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
    },
    resultItem: {
        padding: 15,
        borderBottomWidth: 1,
    },
    resultText: {
        fontSize: 16,
    },
});