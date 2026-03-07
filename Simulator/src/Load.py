import random

#Househol profiles based on PDF
HOUSEHOLD_PROFILES ={
    'studio_1_bed':{
        'base_load_kw': 0.2,
        'peak_spike_kw': 2.5,
        'daily_avg_kwh': 11,
        'annual_energy_kwh_min': 3000,
        'annual_energy_kwh_max': 5000,
        'persons_typical': 1, #This number is only for reference and is not used directly in the simulation, but it can be useful for the dashboard metadata
    },
    'small_family':{
        'base_load_kw': 0.4,
        'peak_spike_kw': 4.5,
        'daily_avg_kwh': 24,
        'annual_energy_kwh_min': 7000,
        'annual_energy_kwh_max': 10000,
        'persons_typical': 2,
    },
    'large_family':{
        'base_load_kw': 0.8,
        'peak_spike_kw': 7.0,
        'daily_avg_kwh': 36,
        'annual_energy_kwh_min': 11000,
        'annual_energy_kwh_max': 16000,
        'persons_typical': 4, 
    }
}

#Wealth multipliers based on PDF
WEALTH_MULTIPLIERS = {
    'low': 0.8,
    'middle': 1.0,
    'high': 1.2,
    'luxury': 1.5
}

class Load:
    """
    Simulates household energy consumption.

    Update:
    - Now supports different household profiles (studio/1-bed, small family, large family) with varying base loads and peak spikes.
    - Now supports wealth-based multipliers to adjust consumption patterns based on socioeconomic status.
    - Stores metadata for the dashboard

    """
    
    def __init__(self, base_load_kw = None, peak_hours_max_kw = None, 
                 peak_hours_start = 18, peak_hours_end = 21, household_type = None,wealth_level = None):
        """
        Initialize load profile.

        With this new configuration, it is posible to add a custon base_load_kk and peak_hours_max_kw, 
        or to select a household profile and wealth level that will determine those parameters based on the PDF provided.
        
        Args:
            base_load_kw (float): Constant base load (e.g., 0.5 kW)
            peak_hours_max_kw (float): Maximum additional load during peaks
            peak_hours_start (int): Start hour of peak (e.g., 18 for 6 PM)
            peak_hours_end (int): End hour of peak (e.g., 21 for 9 PM)
            household_type (str): 'studio_1_bed', 'small_family', 'large_family'
            wealth_level (str): 'low', 'middle', 'high', 'luxury'
        """
        #Configure load parameters based on household type and wealth level, or use custom values if provided
        if household_type is not None:
            if household_type not in HOUSEHOLD_PROFILES:
                raise ValueError(
                    f"Invalid household type: '{household_type}'. "
                    f"Must be one of {list(HOUSEHOLD_PROFILES.keys())}"
                )
            if wealth_level not in WEALTH_MULTIPLIERS:
                raise ValueError(
                    f"Invalid wealth level: '{wealth_level}'. "
                    f"Must be one of {list(WEALTH_MULTIPLIERS.keys())}"
                )
            
            profile = HOUSEHOLD_PROFILES[household_type]
            multiplier = WEALTH_MULTIPLIERS[wealth_level]

            self._base_load_kw = profile['base_load_kw'] * multiplier
            self._peak_hours_max_kw = profile['peak_spike_kw'] * multiplier
            self._household_type = household_type
            self._wealth_level = wealth_level
            self._wealth_multiplier = multiplier
            #Store metada for filtering
            self._daily_avg_kwh = profile['daily_avg_kwh'] * multiplier
            self._annual_kwh_min = profile['annual_energy_kwh_min'] * multiplier
            self._annual_kwh_max = profile['annual_energy_kwh_max'] * multiplier
            self._persons_typical = profile['persons_typical']

        else:
            #Custom configuration without using predefined profiles
            self._base_load_kw = base_load_kw
            self._peak_hours_max_kw = peak_hours_max_kw
            self._household_type = 'custom'
            self._wealth_level = 'custom'
            self._wealth_multiplier = 1.0
            self._daily_avg_kwh = None
            self._annual_kwh_min = None
            self._annual_kwh_max = None
            self._persons_typical = None

        self._peak_hours_start = peak_hours_start
        self._peak_hours_end = peak_hours_end

        # Scheduled events: (hour, probability, min_kw, max_kw)
        # Custom multipliers added
        m = self._wealth_multiplier
        self._scheduled_events = [
            (6, 0.7, 1.0*m, 1.5*m),   # Morning coffee
            (7, 0.5, 0.8*m, 1.2*m),   # Hair dryer
            (8, 0.4, 0.8*m, 1.2*m),   # Washing machine
            (12, 0.6, 1.0*m, 1.5*m),  # Lunch
            (22, 0.3, 0.5*m, 1.0*m),  # Late night snack/activity
        ]
    
    def generate(self, hour):
        """
        Calculate energy demand for given hour.
        
        Args:
            hour (float): Hour of day (0-23, can be fractional for sub-hourly steps)
            
        Returns:
            float: Total load demand in kW
        """
        hour_of_day = int(hour)  # Convert to integer for comparisons
        
        # Component 1: Base load (always present)
        total_demand = self._base_load_kw

        # Component 2: Peak hours (evening activities)
        if self._peak_hours_start <= hour_of_day < self._peak_hours_end:
            # High consumption during evening (cooking, entertainment, etc.)
            total_demand += random.uniform(1.0*self._wealth_multiplier, self._peak_hours_max_kw)

        else:
            # Component 3: Scheduled events (outside peak hours)
            for event_hour, probability, min_kw, max_kw in self._scheduled_events:
                if hour_of_day == event_hour:
                    if random.random() < probability:
                        total_demand += random.uniform(min_kw, max_kw)

        # Component 4: Random noise (always possible, anywhere)
        if random.random() < 0.3:  # 30% chance
            total_demand += random.uniform(0.0, 0.8*self._wealth_multiplier)

        return total_demand
    
    #New get_profile_info() for metadata filtering
    def get_profile_info(self):
        """
        Return a summary of load's configuration
        
        It is going to be use by HouseholdSimulation

        Returns:
            dict: Profile info including all filterable fields
        """
        return {
            'household_type': self._household_type,
            'wealth_level': self._wealth_level,
            'wealth_multiplier': self._wealth_multiplier,
            'persons_typical': self._persons_typical,
            'base_load_kw': self._base_load_kw,
            'peak_hours_max_kw': self._peak_hours_max_kw,
            'daily_avg_kwh': self._daily_avg_kwh,
            'annual_kwh_min': self._annual_kwh_min,
            'annual_kwh_max': self._annual_kwh_max
        }