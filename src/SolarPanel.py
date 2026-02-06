import math

class SolarPanel:
    """
    Simulates solar panel energy generation based on time and weather.
    """
    
    def __init__(self, peak_capacity_kw):
        """
        Initialize solar panel system.
        
        Args:
            peak_capacity_kw (float): Maximum generation capacity in kW
        """
        self._peak_capacity_kw = peak_capacity_kw
    
    def generate(self, hour_of_day, cloud_coverage=0.0):
        """
        Calculate solar generation for given conditions.
        
        Args:
            hour_of_day (float): Hour of day (0-24)
            cloud_coverage (float): Cloud coverage factor (0-1, 0=clear, 1=overcast)
            
        Returns:
            float: Generated power in kW
        """
        # 1. If hour_of_day < 6 or hour_of_day >= 18: return 0.0
        if hour_of_day < 6 or hour_of_day >= 18:
            return 0.0
        # 2. Calculate hours_since_sunrise 
        hours_since_sunrise = hour_of_day - 6
        # 3. Calculate sun_angle
        sun_angle = hours_since_sunrise * (math.pi/12)
        # 4. Calculate base_generation 
        base_generation = self._peak_capacity_kw * math.sin(sun_angle)
        # 5. Apply clouds
        actual_generation = base_generation * (1-cloud_coverage)
        # 6. Return actual_generation
        return actual_generation