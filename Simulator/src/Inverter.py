import random

class Inverter:
    """
    Simulates solar inverter with power clipping and random failures.
    """
    
    def __init__(self, max_output_kw, failure_rate=0.005, 
                 min_failure_duration=4, max_failure_duration=72):
        """
        Initialize inverter.
        
        Args:
            max_output_kw (float): Maximum power output in kW
            failure_rate (float): Daily failure probability (default 0.005 = 0.5%)
            min_failure_duration (int): Minimum failure duration in hours
            max_failure_duration (int): Maximum failure duration in hours
        """
        self._max_output_kw = max_output_kw
        self._failure_rate = failure_rate
        self._min_failure_duration = min_failure_duration
        self._max_failure_duration = max_failure_duration
        self._is_failing = False
        self._failure_hours_remaining = 0
    
    def apply_limit(self, solar_generation):
        """
        Apply inverter clipping and failure effect.
        
        Args:
            solar_generation (float): Raw solar generation in kW
            
        Returns:
            float: Actual power output (0 if failed, clipped if exceeds max)
        """
        #If inverter is currently failing, output is 0
        if(self._is_failing):
            return 0.0
        else:
            #If not, output is min(solar_generation, max_output_kw)
            return min(solar_generation, self._max_output_kw)
    
    def check_failure(self):
        """
        Check if a new failure occurs (call once per day).
        """
        #if it's already failing, do nothing
        if self._is_failing:
            return
        else:
            #If not, check probability and create failure if it occurs
            if random.random() < self._failure_rate:
                self._is_failing = True
                self._failure_hours_remaining = random.randint(self._min_failure_duration, self._max_failure_duration)
    
    def update(self, hours_passed):
        """
        Update failure state.
        
        Args:
            hours_passed (float): Time elapsed in hours
        """

        #If inverter is currently failing, reduce remaining hours
        if self._is_failing:
            self._failure_hours_remaining -= hours_passed
            # If failure duration has elapsed, reset failure state
            if self._failure_hours_remaining <= 0:
                self._is_failing = False
                self._failure_hours_remaining = 0
 
    
    def is_operational(self):
        """Check if inverter is working."""
        #If it is failing, return False
        if self._is_failing:
            return False
        else:
            #If it is not failing, return True
            return True