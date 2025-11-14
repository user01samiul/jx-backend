/**
 * =====================================================
 * JACKPOTX ENTERPRISE FEATURES - ROUTE INTEGRATION
 * =====================================================
 *
 * Import this file in your main index.ts to enable all
 * new enterprise features.
 *
 * Usage in index.ts:
 * ```typescript
 * import { setupEnterpriseRoutes } from './routes/index.enterprise';
 * setupEnterpriseRoutes(app);
 * ```
 */

import { Express } from "express";
import metadataRoutes from "./metadata.routes";
import multilanguageRoutes from "./multilanguage.routes";
import responsibleGamingRoutes from "./responsible-gaming.routes";
import { checkBlockedIP, checkGeoRestriction, trackIP } from "../middlewares/ip-tracking.middleware";

/**
 * Setup all enterprise routes
 */
export function setupEnterpriseRoutes(app: Express): void {
    console.log('🚀 Setting up Enterprise Features...');

    // Apply global middlewares
    app.use(checkBlockedIP); // Block suspicious IPs
    app.use(checkGeoRestriction); // Check geo-restrictions

    // Track IP on login/register
    app.use('/api/auth/login', trackIP('LOGIN'));
    app.use('/api/auth/register', trackIP('REGISTER'));

    // =====================================================
    // METADATA APIs
    // =====================================================
    app.use('/api/metadata', metadataRoutes);
    console.log('✅ Metadata APIs: /api/metadata/*');

    // =====================================================
    // MULTILANGUAGE APIs
    // =====================================================
    app.use('/api/multilanguage', multilanguageRoutes);
    console.log('✅ Multilanguage APIs: /api/multilanguage/*');

    // =====================================================
    // RESPONSIBLE GAMING APIs
    // =====================================================
    app.use('/api/responsible-gaming', responsibleGamingRoutes);
    console.log('✅ Responsible Gaming APIs: /api/responsible-gaming/*');

    console.log('🎉 Enterprise Features Ready!');
}

/**
 * List all enterprise endpoints
 */
export function getEnterpriseEndpoints() {
    return {
        metadata: {
            currencies: [
                'GET /api/metadata/currencies',
                'GET /api/metadata/currencies/:code'
            ],
            countries: [
                'GET /api/metadata/countries',
                'GET /api/metadata/countries/:code',
                'GET /api/metadata/countries/:code/restricted'
            ],
            mobilePrefixes: [
                'GET /api/metadata/mobile-prefixes',
                'GET /api/metadata/mobile-prefixes/country/:code',
                'GET /api/metadata/mobile-prefixes/:prefix/country'
            ]
        },
        multilanguage: {
            languages: [
                'GET /api/multilanguage/languages'
            ],
            translations: [
                'GET /api/multilanguage/translations?lang={code}&category={category}',
                'GET /api/multilanguage/translations/grouped?lang={code}',
                'GET /api/multilanguage/translation/:key?lang={code}'
            ],
            user: [
                'POST /api/multilanguage/user/preferred-language [Auth Required]',
                'GET /api/multilanguage/user/preferred-language [Auth Required]'
            ]
        },
        responsibleGaming: {
            depositLimits: [
                'POST /api/responsible-gaming/deposit-limits [Auth Required]',
                'PUT /api/responsible-gaming/deposit-limits [Auth Required]',
                'GET /api/responsible-gaming/deposit-limits [Auth Required]',
                'GET /api/responsible-gaming/deposit-limits/grouped [Auth Required]',
                'POST /api/responsible-gaming/deposit-limits/check [Auth Required]',
                'DELETE /api/responsible-gaming/deposit-limits/:limitType [Auth Required]',
                'GET /api/responsible-gaming/deposit-limits/history [Auth Required]'
            ],
            selfExclusion: [
                'POST /api/responsible-gaming/self-exclusion [Auth Required]',
                'GET /api/responsible-gaming/self-exclusion [Auth Required]',
                'GET /api/responsible-gaming/self-exclusion/status [Auth Required]',
                'POST /api/responsible-gaming/self-exclusion/revoke [Auth Required]',
                'GET /api/responsible-gaming/self-exclusion/history [Auth Required]'
            ]
        }
    };
}
