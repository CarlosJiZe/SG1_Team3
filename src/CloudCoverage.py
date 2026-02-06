import random

class CloudCoverage:
    """
    Simulates cloud coverage based on seasonal weather patterns.
    """
    
    # Seasonal probabilities: [Clear, Partly Cloudy, Mostly Cloudy, Overcast]
    PROBABILITIES = {
        'spring': [0.1, 0.3, 0.4, 0.2],
        'summer': [0.05, 0.15, 0.3, 0.5],
        'fall': [0.2, 0.4, 0.3, 0.1],
        'winter': [0.3, 0.4, 0.2, 0.1]
    }
    
    # Cloud coverage ranges for each level
    COVERAGE_RANGES = [
        (0.0, 0.2),   # Clear
        (0.2, 0.6),   # Partly Cloudy
        (0.6, 0.8),   # Mostly Cloudy
        (0.8, 0.9)    # Overcast
    ]
    
    def get_daily_coverage(self, season):
        """
        Generate random cloud coverage for a day based on season.
        
        Args:
            season (str): Season name ('spring', 'summer', 'fall', 'winter')
            
        Returns:
            float: Cloud coverage factor (0-0.9)
        """
        # 1. Obtainig the probabilities for the given season
        probabilities = self.PROBABILITIES[season]
        # 2. Selecting cloud coverage
        level = random.choices([0,1,2,3], weights = probabilities)[0]
        # 3. Obtaining the coverage range
        min_coverage, max_coverage = self.COVERAGE_RANGES[level]
        # 4. Generating random coverage within the range
        coverage = random.uniform(min_coverage, max_coverage)
        # 5. Returning the coverage
        return coverage