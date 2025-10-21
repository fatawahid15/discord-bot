/**
 * This file contains the configuration for the role-based tiers.
 * 
 * INSTRUCTIONS:
 * 1. Create the roles listed below in your Discord Server Settings -> Roles.
 * 2. For each role, right-click on it and select "Copy Role ID".
 * 3. Replace the placeholder 'your_role_id_here' with the actual ID.
 * 4. Ensure the bot's own role is higher in the role list than all the roles below.
 */

export const tiers = [
    {
        messages: 5,
        roleName: 'Newcomer',
        roleId: '1429723200484409365'
    },
    {
        messages: 25,
        roleName: 'Wanderer',
        roleId: '1429723822835367997'
    },
    {
        messages: 50,
        roleName: 'Local',
        roleId: '1429724059700297739'
    },
    {
        messages: 100,
        roleName: 'Regular',
        roleId: '1429724423883063336'
    },
    {
        messages: 250,
        roleName: 'Active Member',
        roleId: '1429724482192408586'
    },
    {
        messages: 500,
        roleName: 'Community Pillar',
        roleId: '1429724581664522291'
    },
    {
        messages: 1000,
        roleName: 'Server Veteran',
        roleId: '1429724926859808778'
    },
    {
        messages: 2500,
        roleName: 'Sage',
        roleId: '1429724936695582750'
    },
    {
        messages: 5000,
        roleName: 'Legend',
        roleId: '1429725125564960833'
    },
    {
        messages: 10000,
        roleName: 'Server God',
        roleId: '1429725264455274607'
    }
];
