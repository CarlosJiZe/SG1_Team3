import random

class Load:
    """
    Simulates household energy consumption.
    """
    
    def __init__(self, base_load_kw, peak_hours_max_kw, 
                 peak_hours_start, peak_hours_end):
        """
        Initialize load profile.
        
        Args:
            base_load_kw (float): Constant base load (e.g., 0.5 kW)
            peak_hours_max_kw (float): Maximum additional load during peaks
            peak_hours_start (int): Start hour of peak (e.g., 18 for 6 PM)
            peak_hours_end (int): End hour of peak (e.g., 21 for 9 PM)
        """
        self._base_load_kw = base_load_kw
        self._peak_hours_max_kw = peak_hours_max_kw
        self._peak_hours_start = peak_hours_start
        self._peak_hours_end = peak_hours_end

        # Scheduled events: (hour, probability, min_kw, max_kw)
        self._scheduled_events = [
            (6, 0.7, 1.0, 1.5),   # Morning coffee
            (7, 0.5, 0.8, 1.2),   # Hair dryer
            (8, 0.4, 0.8, 1.2),   # Washing machine
            (12, 0.6, 1.0, 1.5),  # Lunch
            (22, 0.3, 0.5, 1.0),  # Late night snack/activity
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
            total_demand += random.uniform(1.0, self._peak_hours_max_kw)

        else:
            # Component 3: Scheduled events (outside peak hours)
            for event_hour, probability, min_kw, max_kw in self._scheduled_events:
                if hour_of_day == event_hour:
                    if random.random() < probability:
                        total_demand += random.uniform(min_kw, max_kw)

        # Component 4: Random noise (always possible, anywhere)
        if random.random() < 0.3:  # 30% chance
            total_demand += random.uniform(0.0, 0.8)

        return total_demand