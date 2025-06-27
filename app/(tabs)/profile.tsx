// app/(tabs)/profile.tsx - Enhanced Version
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  ListRenderItemInfo,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useTheme } from '../ProfileServices/ThemeContext';

import Bio from '../ProfileServices/bio';
import ProfileImage from '../ProfileServices/ProfileImage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SERVER_URL = 'https://tripping-app.onrender.com';

export default function ProfileScreen() {
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [showSettings, setShowSettings] = useState(false);
  
  const navigation = useNavigation();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const settingsAnim = useRef(new Animated.Value(0)).current;

  // Animation for logout
  const fadeOutAndLogout = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        await auth.signOut();
        router.replace('/Authentication/login');
      } catch (error) {
        Alert.alert('שגיאה', 'לא הצלחנו להתנתק');
        fadeAnim.setValue(1);
      }
    });
  };

  // Settings animation
  const toggleSettings = () => {
    const toValue = showSettings ? 0 : 1;
    Animated.spring(settingsAnim, {
      toValue,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
    setShowSettings(!showSettings);
  };

  const fetchGallery = async (uid: string): Promise<string[]> => {
    try {
      const res = await axios.post(`${SERVER_URL}/get-gallery`, { uid });
      return res.data.gallery;
    } catch (error) {
      console.error('Error fetching gallery:', error);
      return [];
    }
  };

  useEffect(() => {
    const syncUserToBackend = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const userData = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
        };

        await fetch(`${SERVER_URL}/update-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        const profileRes = await fetch(`${SERVER_URL}/get-user-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: user.uid }),
        });

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfilePic(data.profile_image || null);
          setBio(data.bio || '');
        }

        const galleryData = await fetchGallery(user.uid);
        setGallery(galleryData);
      } catch (error) {
        console.error('שגיאה בשליחת או קבלת נתוני המשתמש:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || '');
        }
      }
    };

    syncUserToBackend();
    fetchUsername();
  }, []);

  const uploadImageToServer = async (uri: string, isProfilePic = false) => {
    const user = auth.currentUser;
    if (!user) return;

    const formData = new FormData();
    formData.append('image', {
      uri,
      name: 'image.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('uid', user.uid);
    formData.append('type', isProfilePic ? 'profile' : 'gallery');

    try {
      const response = await fetch(`${SERVER_URL}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        if (isProfilePic) {
          setProfilePic(result.url + `?v=${Date.now()}`);
        } else {
          setGallery(prev => [...prev, result.url]);
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      Alert.alert('שגיאה', 'העלאת התמונה נכשלה');
      console.error(err);
    }
  };

  const saveBio = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await setDoc(doc(db, 'users', user.uid), { bio }, { merge: true });

      await fetch(`${SERVER_URL}/update-user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, bio }),
      });

      setIsEditingBio(false);
    } catch (error) {
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את הביוגרפיה.');
      console.log(error);
    }
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 80],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>טוען פרופיל...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.isDark ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
      />
      
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.animatedHeader,
          { 
            backgroundColor: theme.colors.surface,
            opacity: headerOpacity,
            height: headerHeight,
          }
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{username}</Text>
      </Animated.View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Top Navigation */}
        <View style={styles.topNav}>
          <TouchableOpacity onPress={toggleSettings} style={styles.navButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={fadeOutAndLogout} style={styles.navButton}>
            <Ionicons name="log-out-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Settings Panel */}
        <Animated.View 
          style={[
            styles.settingsPanel,
            { 
              backgroundColor: theme.colors.surface,
              transform: [
                {
                  translateY: settingsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-200, 0],
                  }),
                },
              ],
              opacity: settingsAnim,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.settingsItem} 
            onPress={() => {
              toggleTheme();
              toggleSettings();
            }}
          >
            <Ionicons 
              name={theme.isDark ? 'sunny' : 'moon'} 
              size={20} 
              color={theme.colors.text} 
            />
            <Text style={[styles.settingsText, { color: theme.colors.text }]}>
              {theme.isDark ? 'מצב בהיר' : 'מצב כהה'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
            <Text style={[styles.settingsText, { color: theme.colors.text }]}>התראות</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.text} />
            <Text style={[styles.settingsText, { color: theme.colors.text }]}>עזרה</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {/* Profile Header */}
          <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
            <LinearGradient
              colors={[theme.colors.primary + '20', 'transparent']}
              style={styles.gradientBackground}
            />
            
            <ProfileImage 
              profilePic={profilePic}
              username={username}
              galleryLength={gallery.length}
              onChangeImage={(uri: string) => {
                uploadImageToServer(uri, true).catch(console.error);
              }} 
            />
            
            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                  {gallery.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  פוסטים
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>847</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  עוקבים
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.text }]}>312</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  עוקב אחרי
                </Text>
              </View>
            </View>
          </View>

          {/* Bio Section */}
          <View style={[styles.bioSection, { backgroundColor: theme.colors.surface }]}>
            <Bio
              bio={bio}
              isEditing={isEditingBio}
              onChange={setBio}
              onSave={saveBio}
              onEditToggle={() => setIsEditingBio(prev => !prev)}
            />
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'posts' && { borderBottomColor: theme.colors.primary }
              ]}
              onPress={() => setActiveTab('posts')}
            >
              <Ionicons 
                name="grid-outline" 
                size={20} 
                color={activeTab === 'posts' ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'posts' ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                פוסטים
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'saved' && { borderBottomColor: theme.colors.primary }
              ]}
              onPress={() => setActiveTab('saved')}
            >
              <Ionicons 
                name="bookmark-outline" 
                size={20} 
                color={activeTab === 'saved' ? theme.colors.primary : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === 'saved' ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                שמורים
              </Text>
            </TouchableOpacity>
          </View>

          {/* Gallery */}
          <View style={[styles.galleryContainer, { backgroundColor: theme.colors.background }]}>
            {activeTab === 'posts' ? (
              <FlatList
                data={gallery}
                keyExtractor={(_, index) => index.toString()}
                numColumns={3}
                scrollEnabled={false}
                renderItem={({ item, index }: ListRenderItemInfo<string>) => (
                  <TouchableOpacity 
                    style={[
                      styles.galleryItem,
                      { backgroundColor: theme.colors.surface }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Animated.Image 
                      source={{ uri: item }} 
                      style={styles.galleryImage}
                      key={`gallery-${index}`}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.3)']}
                      style={styles.galleryOverlay}
                    />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
                ListFooterComponent={() => (
                  <TouchableOpacity 
                    style={[styles.addPhotoButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      // Handle add photo
                    }}
                  >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addPhotoText}>הוסף תמונה</Text>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="bookmark-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                  אין פוסטים שמורים
                </Text>
              </View>
            )}
          </View>
        </Animated.ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  topNav: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  navButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // רקע עדין שמתאים לשני המצבים
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  settingsPanel: {
    position: 'absolute',
    top: 80,
    right: 20,
    left: 20,
    zIndex: 15,
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  settingsItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsText: {
    fontSize: 16,
    marginRight: 12,
    textAlign: 'right',
  },
  profileHeader: {
    paddingVertical: 20,
    alignItems: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  statsContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  bioSection: {
    marginBottom: 8,
    paddingVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
  },
  galleryContainer: {
    flex: 1,
    padding: 2,
  },
  galleryItem: {
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  addPhotoButton: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FF6F00',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addPhotoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },    
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});