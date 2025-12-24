// Конфигурация;
const API_BASE_URL = 'https://api.weatherapi.com/v1';
const FORECAST_DAYS = 3; // Сегодня + 2 следующих дня

// DOM элементы
let weatherContainer;
let cityList;
let addCityBtn;
let refreshBtn;
let cityModal;
let cityInput;
let citySuggestions;
let cityError;
let confirmAddCityBtn;
let cancelAddCityBtn;
let errorNotification;
let errorMessage;
let closeErrorBtn;

// Состояние приложения
let cities = [];
let activeCityIndex = 0;
let isLoading = false;

// Предустановленный список городов для автодополнения
const CITIES_LIST = [
    'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
    'Нижний Новгород', 'Челябинск', 'Самара', 'Ростов-на-Дону', 'Уфа',
    'Красноярск', 'Пермь', 'Воронеж', 'Волгоград', 'Сочи',
    'Краснодар', 'Тюмень', 'Ижевск', 'Барнаул', 'Иркутск',
    'New York', 'London', 'Paris', 'Tokyo', 'Berlin',
    'Madrid', 'Rome', 'Sydney', 'Toronto', 'Dubai'
];

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    weatherContainer = document.getElementById('weather-container');
    cityList = document.getElementById('city-list');
    addCityBtn = document.getElementById('add-city-btn');
    refreshBtn = document.getElementById('refresh-btn');
    cityModal = document.getElementById('city-modal');
    cityInput = document.getElementById('city-input');
    citySuggestions = document.getElementById('city-suggestions');
    cityError = document.getElementById('city-error');
    confirmAddCityBtn = document.getElementById('confirm-add-city');
    cancelAddCityBtn = document.getElementById('cancel-add-city');
    errorNotification = document.getElementById('error-notification');
    errorMessage = document.getElementById('error-message');
    closeErrorBtn = document.getElementById('close-error');
    
    loadCitiesFromStorage();
    
    if (cities.length === 0) {
        requestGeolocation();
    } else {
        loadWeatherForActiveCity();
    }
    
    setupEventListeners();
    
    renderCityList();
});

// Установка обработчиков событий
function setupEventListeners() {
    refreshBtn.addEventListener('click', () => {
        loadWeatherForActiveCity();
    });
    
    addCityBtn.addEventListener('click', () => {
        openCityModal();
    });
    
    cityInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (value.length > 0) {
            showCitySuggestions(value);
        } else {
            hideCitySuggestions();
        }
        hideCityError();
    });
    
    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !citySuggestions.contains(e.target)) {
            hideCitySuggestions();
        }
    });
    
    confirmAddCityBtn.addEventListener('click', () => {
        const cityName = cityInput.value.trim();
        if (cityName) {
            addCity(cityName);
        }
    });
    
    cancelAddCityBtn.addEventListener('click', () => {
        closeCityModal();
    });
    
    closeErrorBtn.addEventListener('click', () => {
        hideErrorNotification();
    });
}

// Запрос геолокации
function requestGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                const locationCity = {
                    name: 'Текущее местоположение',
                    lat: latitude,
                    lon: longitude,
                    isCurrentLocation: true
                };
                cities.push(locationCity);
                saveCitiesToStorage();
                renderCityList();
                loadWeatherForActiveCity();
            },
            error => {
                showError('Не удалось получить доступ к геолокации. Пожалуйста, добавьте город вручную.');
                openCityModal();
            }
        );
    } else {
        showError('Ваш браузер не поддерживает геолокацию. Пожалуйста, добавьте город вручную.');
        openCityModal();
    }
}

// Загрузка погоды для активного города
function loadWeatherForActiveCity() {
    if (cities.length === 0 || activeCityIndex >= cities.length) return;
    
    const city = cities[activeCityIndex];
    showLoading();
    
    let apiUrl;
    if (city.isCurrentLocation) {
        apiUrl = `${API_BASE_URL}/forecast.json?key=${API_KEY}&q=${city.lat},${city.lon}&days=${FORECAST_DAYS}&lang=ru`;
    } else {
        apiUrl = `${API_BASE_URL}/forecast.json?key=${API_KEY}&q=${city.name}&days=${FORECAST_DAYS}&lang=ru`;
    }
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка при загрузке данных о погоде');
            }
            return response.json();
        })
        .then(data => {
            renderWeatherCard(data, city);
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            showError('Не удалось загрузить данные о погоде. Пожалуйста, попробуйте еще раз.');
            renderErrorCard(city);
        });
}

// Отображение карточки погоды
function renderWeatherCard(data, city) {
    while (weatherContainer.firstChild) {
        weatherContainer.removeChild(weatherContainer.firstChild);
    }
    
    const weatherCard = document.createElement('div');
    weatherCard.className = 'weather-card';
    
    const cityName = document.createElement('h2');
    cityName.className = 'city-name';
    cityName.textContent = city.isCurrentLocation ? 'Текущее местоположение' : data.location.name;
    weatherCard.appendChild(cityName);
    
    const currentDate = document.createElement('div');
    currentDate.className = 'current-date';
    currentDate.textContent = new Date().toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    weatherCard.appendChild(currentDate);
    
    const currentWeather = document.createElement('div');
    currentWeather.className = 'current-weather';
    
    const weatherIcon = document.createElement('img');
    weatherIcon.className = 'weather-icon';
    weatherIcon.src = 'https:' + data.current.condition.icon;
    weatherIcon.alt = data.current.condition.text;
    currentWeather.appendChild(weatherIcon);
    
    const temperature = document.createElement('div');
    temperature.className = 'temperature';
    temperature.textContent = `${Math.round(data.current.temp_c)}°C`;
    currentWeather.appendChild(temperature);
    
    weatherCard.appendChild(currentWeather);
    
    const weatherDescription = document.createElement('div');
    weatherDescription.className = 'weather-description';
    weatherDescription.textContent = data.current.condition.text;
    weatherCard.appendChild(weatherDescription);
    
    const weatherDetails = document.createElement('div');
    weatherDetails.className = 'weather-details';
    
    const feelsLike = document.createElement('div');
    feelsLike.className = 'detail-item';
    feelsLike.innerHTML = `
        <span class="detail-label">Ощущается как:</span>
        <span class="detail-value">${Math.round(data.current.feelslike_c)}°C</span>
    `;
    weatherDetails.appendChild(feelsLike);
    
    const humidity = document.createElement('div');
    humidity.className = 'detail-item';
    humidity.innerHTML = `
        <span class="detail-label">Влажность:</span>
        <span class="detail-value">${data.current.humidity}%</span>
    `;
    weatherDetails.appendChild(humidity);
    
    const wind = document.createElement('div');
    wind.className = 'detail-item';
    wind.innerHTML = `
        <span class="detail-label">Ветер:</span>
        <span class="detail-value">${data.current.wind_kph} км/ч</span>
    `;
    weatherDetails.appendChild(wind);
    
    const pressure = document.createElement('div');
    pressure.className = 'detail-item';
    pressure.innerHTML = `
        <span class="detail-label">Давление:</span>
        <span class="detail-value">${data.current.pressure_mb} мбар</span>
    `;
    weatherDetails.appendChild(pressure);
    
    weatherCard.appendChild(weatherDetails);
    
    const forecast = document.createElement('div');
    forecast.className = 'forecast';
    
    const forecastTitle = document.createElement('h3');
    forecastTitle.className = 'forecast-title';
    forecastTitle.textContent = 'Прогноз на несколько дней';
    forecast.appendChild(forecastTitle);
    
    const forecastDays = document.createElement('div');
    forecastDays.className = 'forecast-days';
    
    for (let i = 0; i < data.forecast.forecastday.length; i++) {
        const dayData = data.forecast.forecastday[i];
        const forecastDay = document.createElement('div');
        forecastDay.className = 'forecast-day';
        
        const forecastDate = document.createElement('div');
        forecastDate.className = 'forecast-date';
        const date = new Date(dayData.date);
        forecastDate.textContent = i === 0 ? 'Сегодня' : date.toLocaleDateString('ru-RU', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        forecastDay.appendChild(forecastDate);
        
        const forecastIcon = document.createElement('img');
        forecastIcon.className = 'forecast-icon';
        forecastIcon.src = 'https:' + dayData.day.condition.icon;
        forecastIcon.alt = dayData.day.condition.text;
        forecastDay.appendChild(forecastIcon);
        
        const forecastTemp = document.createElement('div');
        forecastTemp.className = 'forecast-temp';
        forecastTemp.textContent = `${Math.round(dayData.day.mintemp_c)}° / ${Math.round(dayData.day.maxtemp_c)}°`;
        forecastDay.appendChild(forecastTemp);
        
        forecastDays.appendChild(forecastDay);
    }
    
    forecast.appendChild(forecastDays);
    weatherCard.appendChild(forecast);
    
    weatherContainer.appendChild(weatherCard);
}

// Отображение индикатора загрузки
function showLoading() {
    while (weatherContainer.firstChild) {
        weatherContainer.removeChild(weatherContainer.firstChild);
    }
    
    const loadingCard = document.createElement('div');
    loadingCard.className = 'weather-card loading';
    
    const loader = document.createElement('div');
    loader.className = 'loader';
    loadingCard.appendChild(loader);
    
    weatherContainer.appendChild(loadingCard);
}

// Отображение карточки ошибки
function renderErrorCard(city) {
    while (weatherContainer.firstChild) {
        weatherContainer.removeChild(weatherContainer.firstChild);
    }
    
    const errorCard = document.createElement('div');
    errorCard.className = 'weather-card error';
    
    const cityName = document.createElement('h2');
    cityName.className = 'city-name';
    cityName.textContent = city.isCurrentLocation ? 'Текущее местоположение' : city.name;
    errorCard.appendChild(cityName);
    
    const errorMessage = document.createElement('p');
    errorMessage.textContent = 'Не удалось загрузить данные о погоде. Пожалуйста, попробуйте еще раз.';
    errorCard.appendChild(errorMessage);
    
    weatherContainer.appendChild(errorCard);
}

// Отображение списка городов
function renderCityList() {
    while (cityList.firstChild) {
        cityList.removeChild(cityList.firstChild);
    }
    
    cities.forEach((city, index) => {
        const cityItem = document.createElement('div');
        cityItem.className = 'city-item';
        if (index === activeCityIndex) {
            cityItem.classList.add('active');
        }
        
        const cityName = document.createElement('div');
        cityName.textContent = city.isCurrentLocation ? 'Текущее местоположение' : city.name;
        cityItem.appendChild(cityName);
        
        if (!city.isCurrentLocation) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-city';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeCity(index);
            });
            cityItem.appendChild(deleteBtn);
        }
        
        cityItem.addEventListener('click', () => {
            selectCity(index);
        });
        
        cityList.appendChild(cityItem);
    });
}

// Выбор города
function selectCity(index) {
    if (index === activeCityIndex) return;
    
    activeCityIndex = index;
    renderCityList();
    loadWeatherForActiveCity();
}

// Удаление города
function removeCity(index) {
    if (index < cities.length && !cities[index].isCurrentLocation) {
        cities.splice(index, 1);
        
        if (index === activeCityIndex) {
            activeCityIndex = 0;
        } else if (index < activeCityIndex) {
            activeCityIndex--;
        }
        
        saveCitiesToStorage();
        renderCityList();
        loadWeatherForActiveCity();
    }
}

// Открытие модального окна добавления города
function openCityModal() {
    cityModal.classList.remove('hidden');
    cityInput.value = '';
    hideCitySuggestions();
    hideCityError();
    cityInput.focus();
}

// Закрытие модального окна добавления города
function closeCityModal() {
    cityModal.classList.add('hidden');
}

// Показать предложения городов
function showCitySuggestions(query) {
    const filteredCities = CITIES_LIST.filter(city =>
        city.toLowerCase().includes(query.toLowerCase())
    );
    
    while (citySuggestions.firstChild) {
        citySuggestions.removeChild(citySuggestions.firstChild);
    }
    
    filteredCities.forEach(city => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'suggestion-item';
        suggestionItem.textContent = city;
        suggestionItem.addEventListener('click', () => {
            cityInput.value = city;
            hideCitySuggestions();
        });
        citySuggestions.appendChild(suggestionItem);
    });
    
    citySuggestions.classList.remove('hidden');
}

// Скрыть предложения городов
function hideCitySuggestions() {
    citySuggestions.classList.add('hidden');
}

// Показать ошибку валидации города
function showCityError(message) {
    cityError.textContent = message;
    cityError.classList.remove('hidden');
}

// Скрыть ошибку валидации города
function hideCityError() {
    cityError.classList.add('hidden');
}

// Добавление города
function addCity(cityName) {
    const cityExists = cities.some(city => 
        !city.isCurrentLocation && city.name.toLowerCase() === cityName.toLowerCase()
    );
    
    if (cityExists) {
        showCityError('Этот город уже добавлен');
        return;
    }
    
    const cityExistsInList = CITIES_LIST.some(city => 
        city.toLowerCase() === cityName.toLowerCase()
    );
    
    if (!cityExistsInList) {
        showCityError('Выберите город из списка');
        return;
    }
    
    cities.push({
        name: cityName,
        isCurrentLocation: false
    });
    
    saveCitiesToStorage();
    
    renderCityList();
    
    closeCityModal();
    
    if (cities.length === 1) {
        activeCityIndex = 0;
        loadWeatherForActiveCity();
    }
}

// Показать уведомление об ошибке
function showError(message) {
    errorMessage.textContent = message;
    errorNotification.classList.remove('hidden');
    
    setTimeout(() => {
        hideErrorNotification();
    }, 5000);
}

// Скрыть уведомление об ошибке
function hideErrorNotification() {
    errorNotification.classList.add('hidden');
}

// Сохранение городов в localStorage
function saveCitiesToStorage() {
    localStorage.setItem('weatherCities', JSON.stringify(cities));
    localStorage.setItem('activeCityIndex', activeCityIndex.toString());
}

// Загрузка городов из localStorage
function loadCitiesFromStorage() {
    const savedCities = localStorage.getItem('weatherCities');
    const savedActiveIndex = localStorage.getItem('activeCityIndex');
    
    if (savedCities) {
        try {
            cities = JSON.parse(savedCities);
        } catch (e) {
            console.error('Error parsing saved cities:', e);
            cities = [];
        }
    }
    
    if (savedActiveIndex) {
        activeCityIndex = parseInt(savedActiveIndex, 10);
    }
}