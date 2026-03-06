import random

class Inverter:
    """
    Simulates solar inverter with power clipping and random failures.

    FIX: Refactor version (changes):
    - Failure is now modeled as a Simpy process
    - Uses exponential distribution
    - Models a single failure probability at a specific point in time
    - We replace the ckech_failure() and update()


    """
    
    def __init__(self, max_output_kw, avr_days_in_failure = 200, 
                 min_failure_duration=4, max_failure_duration=72, panels_connected=1):
        """
        Initialize inverter.
        
        Args:
            max_output_kw (float): Maximum power output in kW
            avr_days_in_failure (float): Average days between failures.
            min_failure_duration (int): Minimum failure duration in hours
            max_failure_duration (int): Maximum failure duration in hours
            panels_connected (int): Number of solar panels connected to this inverter
        """
        self._max_output_kw = max_output_kw
        self._avr_days_in_failure = avr_days_in_failure
        self._min_failure_duration = min_failure_duration
        self._max_failure_duration = max_failure_duration
        self._is_failing = False
        self.total_failures = 0

        self._total_downtime_hours = 0.0
        self.current_failure_duration = 0.0
        self.panels_connected = panels_connected
    
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
    
    def is_operational(self):
        """Check if inverter is working."""
        #If it is failing, return False
        if self._is_failing:
            return False
        else:
            #If it is not failing, return True
            return True
        
    def failure_process(self, env):
        """
        Simpy process that models inverter failures over time.

        In this iteration we calculate once the probability at the start (and after each recovery)

        Process:
        1.- Generate a random time from exponetial distribution
        2.- Sleep until that time arrives
        3.- Change state _is_failing to True
        4.- Generate a random failure duration between min and max
        5.- Sleep until failure duration is over
        6.- Change state _is_failing to False
        7.- Repeat from step 1

        We choose exponential distribution because it is commonly used to model time between failures in reliability engineering.

        Args: 
            env(simpy.Environment): Simpy simulation environment

        Yields:
            simpy.events.Timeout: Timeouts for failure occurrence and recovery
        
        """
        while True:
            #Step 1: Calculate when the next failure will occur
            avr_hours_in_failure = self._avr_days_in_failure *24 #Convert days to hours
            hours_until_failure = random.expovariate(1/avr_hours_in_failure)

            #Step 2: Sleep until failure occurs
            yield env.timeout(hours_until_failure*60) #Convert hours to minutes for env.timeout

            #Step 3: Inverter fails
            self._is_failing = True
            self.total_failures += 1

            #Step 4: Calculate failure duration
            failure_duration = random.uniform(
                self._min_failure_duration, self._max_failure_duration
            )
            self.current_failure_duration = failure_duration

            #Step 5: Sleep until failure is resolved
            yield env.timeout(failure_duration*60) #Convert hours to minutes for env.timeout

            #Step 6: Inverter recovers
            self._is_failing = False
            self._total_downtime_hours += failure_duration
