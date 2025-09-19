// app/IndexServices/CreateEvent/locationService.ts
import { LocationData } from './types';

export class LocationService {
    private static mapboxToken = 'pk.eyJ1Ijoibm9hbS1sZTE3IiwiYSI6ImNtZTczeG4wdzAwZjcya3Nod2U2d3M4OTUifQ.0ybxsmWtdKP95wmyMw491w';

    static async reverseGeocode(latitude: string, longitude: string): Promise<LocationData> {
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${this.mapboxToken}&language=he`
            );
            const data = await response.json();

            if (data.features?.length > 0) {
                const feature = data.features[0];
                const eventLocation = feature.place_name_he || feature.place_name;

                const contexts = feature.context || [];
                const place = contexts.find((c: any) => c.id.includes('place'));
                const country = contexts.find((c: any) => c.id.includes('country'));

                let cityCountry = '';
                if (place && country) {
                    cityCountry = `${place.text_he || place.text}, ${country.text_he || country.text}`;
                }

                return { eventLocation, cityCountry };
            } else {
                return {
                    eventLocation: 'לא נמצאה כתובת',
                    cityCountry: ''
                };
            }
        } catch (error) {
            console.error('Error during reverse geocoding:', error);
            return {
                eventLocation: 'שגיאה בטעינת המיקום',
                cityCountry: ''
            };
        }
    }
}