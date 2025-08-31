// SearchBarComponent.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTheme } from '../../../app/ProfileServices/ThemeContext';
import Searchbar, { SearchResult } from '../MapButtons/Searchbar';
import { homeScreenStyles } from '../styles/homeScreenStyles';

interface SearchBarComponentProps {
  isSearchbarVisible: boolean;
  searchbarResults: SearchResult[];
  setSearchbarResults: (results: SearchResult[]) => void;
  // עדכון: הוספת zoomLevel לפונקציה onSelectResult
  onSelectResult: (latitude: number, longitude: number, zoomLevel: number) => void;
  onClose: () => void;
  onOpen: () => void;
}

export const SearchBarComponent: React.FC<SearchBarComponentProps> = ({
  isSearchbarVisible,
  searchbarResults,
  setSearchbarResults,
  onSelectResult,
  onClose,
  onOpen
}) => {
  const { theme } = useTheme();

  return (
    <>
      {isSearchbarVisible ? (
        <Searchbar
          onSelectResult={(latitude, longitude, zoomLevel) => onSelectResult(latitude, longitude, zoomLevel)}
          results={searchbarResults}
          setResults={setSearchbarResults}
          onFocus={() => {}}
          onClose={onClose}
        />
      ) : (
        <TouchableOpacity
          style={[homeScreenStyles.searchButton, { backgroundColor: '#3A8DFF' }]}
          onPress={onOpen}
        >
          <Ionicons name="search" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </>
  );
};