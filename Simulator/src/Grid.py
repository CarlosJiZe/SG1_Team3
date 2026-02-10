class Grid:
    """
    Manages energy import/export transactions with the utility grid.
    """
    
    def __init__(self, import_cost_per_kwh, export_revenue_per_kwh, 
                 export_limit_kw):
        """
        Initialize grid connection.
        
        Args:
            import_cost_per_kwh (float): Cost to import energy ($/kWh)
            export_revenue_per_kwh (float): Revenue from exporting ($/kWh)
            export_limit_kw (float): Maximum export power (kW)
        """
        self._import_cost_per_kwh = import_cost_per_kwh
        self._export_revenue_per_kwh = export_revenue_per_kwh
        self._export_limit_kw = export_limit_kw
        
        self._total_energy_imported_kwh = 0.0
        self._total_energy_exported_kwh = 0.0
        self._total_import_cost = 0.0
        self._total_export_revenue = 0.0
    
    def import_energy(self, power_kw, time_step_hours=1.0):
        """
        Import (buy) energy from grid.
        
        Args:
            power_kw (float): Power to import in kW
            time_step_hours (float): Duration of time step in hours
            
        Returns:
            float: Cost of this import in dollars
        """
        # 1. Convert power to energy for this time step
        energy_kwh = power_kw * time_step_hours
        
        # 2. Sum energy_kwh to total_imported
        self._total_energy_imported_kwh += energy_kwh
        
        # 3. Calculate cost
        cost = energy_kwh * self._import_cost_per_kwh
        
        # 4. Sum cost to total_cost
        self._total_import_cost += cost
        
        # 5. Return cost
        return cost
    
    def export_energy(self, power_kw, time_step_hours=1.0):
        """
        Export (sell) energy to grid.
        
        Args:
            power_kw (float): Power to export in kW
            time_step_hours (float): Duration of time step in hours
            
        Returns:
            float: Actual power exported in kW (may be limited by export_limit_kw)
        """
        # 1. Apply export limit (limit POWER, not energy)
        actual_power_kw = min(power_kw, self._export_limit_kw)
        
        # 2. Convert to energy for this time step
        energy_kwh = actual_power_kw * time_step_hours
        
        # 3. Sum energy_kwh to total_exported
        self._total_energy_exported_kwh += energy_kwh
        
        # 4. Calculate revenue
        revenue = energy_kwh * self._export_revenue_per_kwh
        
        # 5. Sum revenue to total_revenue
        self._total_export_revenue += revenue
        
        # 6. Return actual POWER exported (for energy flow tracking)
        return actual_power_kw
    
    def get_total_imported(self):
        """Get total energy imported in kWh."""
        return self._total_energy_imported_kwh
    
    def get_total_exported(self):
        """Get total energy exported in kWh."""
        return self._total_energy_exported_kwh
    
    def get_total_cost(self):
        """Get total cost of imported energy in dollars."""
        return self._total_import_cost
    
    def get_total_revenue(self):
        """Get total revenue from exported energy in dollars."""
        return self._total_export_revenue
    
    def get_net_balance(self):
        """
        Get net financial balance.
        
        Returns:
            float: Net balance (revenue - cost) in dollars
                  Positive = profit, Negative = loss
        """
        return self._total_export_revenue - self._total_import_cost
