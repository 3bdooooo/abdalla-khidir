
import { Asset, User, WorkOrder, AssetStatus, MovementLog } from '../types';
import { LOCATIONS } from './mockDb';

// --- 1. Predictive Risk Scoring Engine ---

export const calculateAssetRiskScore = (
    asset: Asset, 
    workOrders: WorkOrder[], 
    movementLogs: MovementLog[]
): number => {
    let score = 0;

    // Factor 1: Age (2 points per year)
    const purchaseYear = new Date(asset.purchase_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - purchaseYear;
    score += age * 2;

    // Factor 2: Utilization (1 point per 500 hours)
    score += Math.floor(asset.operating_hours / 500);

    // Factor 3: Reliability (10 points per breakdown in last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentFailures = workOrders.filter(wo => 
        (wo.asset_id === asset.asset_id || wo.asset_id === asset.nfc_tag_id) && 
        wo.type === 'Corrective' &&
        new Date(wo.created_at) > sixMonthsAgo
    ).length;
    
    score += recentFailures * 10;

    // Factor 4: Mobility Stress (RFID/Movement)
    // Frequent movement increases risk of physical damage
    const recentMoves = movementLogs.filter(log => 
        log.asset_id === asset.asset_id && 
        new Date(log.timestamp) > sixMonthsAgo
    ).length;
    
    score += recentMoves * 5;

    // Cap at 100
    return Math.min(Math.round(score), 100);
};

// --- 2. Smart Technician Assignment Engine ---

export interface TechRecommendation {
    user: User;
    score: number;
    reason: string;
}

export const recommendTechnicians = (
    asset: Asset, 
    technicians: User[], 
    allWorkOrders: WorkOrder[]
): TechRecommendation[] => {
    
    const assetLocation = LOCATIONS.find(l => l.location_id === asset.location_id);

    const scoredTechs = technicians.map(tech => {
        let score = 0;
        const reasons: string[] = [];

        // Criteria A: Proximity (50 points)
        const techLocation = LOCATIONS.find(l => l.location_id === tech.location_id);
        
        // Exact same room/location
        if (tech.location_id === asset.location_id) {
            score += 50;
            reasons.push("On Site");
        } 
        // Same Department
        else if (techLocation?.department === assetLocation?.department) {
            score += 30;
            reasons.push("Same Dept");
        }

        // Criteria B: Expertise (History with this Model) (10 points per repair)
        const experienceCount = allWorkOrders.filter(wo => 
            wo.assigned_to_id === tech.user_id && 
            wo.status === 'Closed' &&
            // We need to check if the WO was for an asset with the same model
            // (In a real DB join, this is easier. Here we assume generic expertise)
            true 
        ).length;

        // In a real app, filtering by model is key. For now, general experience:
        const modelExperience = Math.min(experienceCount * 2, 40); // Cap at 40
        if (modelExperience > 10) {
            score += modelExperience;
            reasons.push(`Expert (${experienceCount} Jobs)`);
        }

        // Criteria C: Workload (Negative points for too many open jobs)
        const openJobs = allWorkOrders.filter(wo => 
            wo.assigned_to_id === tech.user_id && 
            wo.status !== 'Closed'
        ).length;
        
        score -= (openJobs * 5);
        if (openJobs > 3) reasons.push("Busy");

        return { user: tech, score, reason: reasons.join(', ') };
    });

    // Return sorted by score (Highest first)
    return scoredTechs.sort((a, b) => b.score - a.score);
};
