'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


let map, mapEvent;

class App {

    //private properties
    #map;
    #mapEvent;
    #mapZoomLevel = 13;
    #workouts = []; 

    constructor(){  // at first load 

        // Get user's position
        this._getPosition();

        // Get data from local storage
        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    }

    _getPosition(){

        if (navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
            function(){
                alert('Could not get your current position')
            })
        }
    }

    _loadMap(position){

        const {longitude, latitude} = position.coords;
        const mapURl = `https://www.google.com/maps/@${latitude},${longitude}`

        const coord = [latitude, longitude]
        this.#map = L.map('map').setView(coord, this.#mapZoomLevel);

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        
        this.#map.on('click', this._showForm.bind(this))

        this.#workouts.forEach(work => {
            this._renderMarkerOnMap(work)
        })
        
    }


    _showForm(mapE){
        this.#mapEvent = mapE
        form.classList.remove('hidden');
        inputDistance.focus()      
    }

    _hideForm(){

        // clear input fields
        inputDuration.value = inputCadence.value = inputDistance.value = inputElevation.value = '';

        form.style.display = 'none'
        form.classList.add('hidden');

        setTimeout(()=> {
            form.style.display = 'grid'
        } , 1000)
        
    }

    _toggleElevationField(){
        // 2 ways to access parent 
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden') // closest select parents not child
        inputElevation.parentElement.classList.toggle('form__row--hidden')
    }

    _newWorkout(e){

        e.preventDefault();

        // Helper functions for validation 
        const validInputs = (...inputs) => inputs.every(x => Number.isFinite(x))  // ...inputs => array of inputs
        const positiveValues = (...inputs) => inputs.every(x => x > 0)

        // Get Form data 
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let workout;
        const {lat, lng} = this.#mapEvent.latlng;


        // create workout object => running or cycling 
        if(type === 'cycling'){
            const elevation = +inputElevation.value;

            if(!validInputs(distance, duration, elevation) || !positiveValues(distance, duration)) return alert('Inputs have to be positive numbers!');
            workout = new Cycling(duration, distance, [lat, lng], elevation)
        }

        if (type === 'running') {
            const cadence = +inputCadence.value

            if(!validInputs(distance, duration, cadence) || !positiveValues(distance, duration, cadence)) return alert('Inputs have to be positive numbers!');
            workout = new Running(duration, distance, [lat, lng], cadence)
        }

        this.#workouts.push(workout)

        // render on map as marker 
        this._renderMarkerOnMap(workout);

        // render on list 
        this._renderWorkoutList(workout);

        // Reset form 
        this._hideForm();

        // Set local storage to all workouts 
        this._setLocalStorage()
        
    }

    _renderMarkerOnMap (workout){

        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            autoClose: false,
            className: `${workout.type}-popup`,
            closeOnClick: false
        }).setContent(`${workout.type === 'running'? '🏃‍♂️': '🚴‍♀️'} ${workout.description}`)
        )
        .openPopup();
    }


    _renderWorkoutList(workout){

        let html = ` 
            <li class="workout workout--${workout.type}" data-id=${workout.id}>
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running'? '🏃‍♂️': '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">${workout.duration}</span>
                <span class="workout__unit">min</span>
            </div>
        ` 
         
         if(workout.type === 'running'){
            html += `
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.pace}</span>
                <span class="workout__unit">min/km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">🦶🏼</span>
                <span class="workout__value">${workout.cadence}</span>
                <span class="workout__unit">spm</span>
            </div>
            </li>
            `
         }

         if(workout.type === 'cycling'){
            html+=`
            <div class="workout__details">
                <span class="workout__icon">⚡️</span>
                <span class="workout__value">${workout.speed}</span>
                <span class="workout__unit">km/h</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⛰</span>
                <span class="workout__value">${workout.elevationGain}</span>
                <span class="workout__unit">m</span>
            </div>
            </li>
            `
         }
         
         form.insertAdjacentHTML('afterend', html)
    }

    _setLocalStorage(){
        localStorage.setItem( "workouts", JSON.stringify(this.#workouts));
    }

    _resetLocalStorage(){
        localStorage.removeItem( "workouts");
        location.reload()
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem("workouts"));
        if(!data) return

        this.#workouts = data
        this.#workouts.forEach(work => this._renderWorkoutList(work))
        
    }


    _moveToPopup (e){

        const workoutEl  = e.target.closest('.workout')
        if(!workoutEl ) return

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

        this.#map.setView(workout.coords , this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1,
            },
        })

    }
}

class Workout {

    date = new Date();  // fields
    id = Math.random().toString().slice(5) // fields

    constructor(duration, distance, coords){
        this.duration= duration;
        this.distance= distance; // km
        this.coords= coords; // min
    }

    _setDescription () {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`

    }
}

class Running extends Workout {
    type = 'running' // same like if it's in the constructor 

    constructor(duration, distance, coords, cadence){
        super(duration, distance, coords);
        this.cadence= cadence;
        this.calcPace();
        this._setDescription()
    }
    // min/ km
    calcPace = () => {
        this.pace = this.duration / this.distance
        return this.pace 
    }
}

class Cycling extends Workout {
    type = 'cycling'

    constructor(duration, distance, coords, elevationGain){
        super(duration, distance, coords);
        this.elevationGain= elevationGain;
        this.calcSpeed();
        this._setDescription();
    }

    // km/hr
    calcSpeed (){
        this.speed = this.distance / (this.duration /60)
        console.log(this.speed);
        return this.speed
    } 
}


const app = new App();

 