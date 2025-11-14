/**
 * ISoftBet Proxy Controller
 *
 * Proxies XML configuration requests from ISoftBet games to our local server.
 * ISB games like Aztec Gold Megaways require these XML files to initialize.
 */

import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export class ISoftBetProxyController {
  /**
   * Handle ISoftBet XML generation requests
   * URL pattern: /generate-xml/games/:gameId/:type/:sessionId/:param1/:param2
   *
   * Types:
   * - 3: Game configuration XML
   * - 5: Reel configuration XML
   * - 7: Paytable configuration XML
   */
  static async generateXML(req: Request, res: Response): Promise<void> {
    try {
      const { gameId, type, sessionId, param1, param2 } = req.params;

      console.log(`[ISB_PROXY] XML Request - Game: ${gameId}, Type: ${type}, Session: ${sessionId}`);

      // Map of ISB game IDs to our game codes
      const gameMapping: { [key: string]: string } = {
        '77': 'aztec_gold_megaways',
        // Add more ISB games here as needed
      };

      const gameCode = gameMapping[gameId];
      if (!gameCode) {
        res.status(404).send(`<?xml version="1.0"?><error>Game ${gameId} not found</error>`);
        return;
      }

      // Generate XML based on type
      let xmlContent: string;

      switch (type) {
        case '3':
          xmlContent = ISoftBetProxyController.generateGameConfigXML(gameCode, sessionId);
          break;
        case '5':
          xmlContent = ISoftBetProxyController.generateReelConfigXML(gameCode, sessionId);
          break;
        case '7':
          xmlContent = ISoftBetProxyController.generatePaytableConfigXML(gameCode, sessionId);
          break;
        default:
          res.status(400).send(`<?xml version="1.0"?><error>Unknown type ${type}</error>`);
          return;
      }

      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Access-Control-Allow-Origin', '*');
      res.send(xmlContent);

    } catch (error) {
      console.error('[ISB_PROXY] Error generating XML:', error);
      res.status(500).send(`<?xml version="1.0"?><error>${(error as Error).message}</error>`);
    }
  }

  /**
   * Generate game configuration XML (Type 3)
   */
  private static generateGameConfigXML(gameCode: string, sessionId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<game>
  <id>${gameCode}</id>
  <name>Aztec Gold Megaways</name>
  <session>${sessionId}</session>
  <settings>
    <rtp>96.00</rtp>
    <volatility>high</volatility>
    <minBet>0.20</minBet>
    <maxBet>20.00</maxBet>
    <maxWin>20000</maxWin>
    <reels>6</reels>
    <rows>7</rows>
    <megaways>true</megaways>
    <cascade>true</cascade>
    <multiplier>unlimited</multiplier>
  </settings>
  <features>
    <feature id="freespins">true</feature>
    <feature id="multiplier">true</feature>
    <feature id="cascade">true</feature>
    <feature id="megaways">true</feature>
  </features>
</game>`;
  }

  /**
   * Generate reel configuration XML (Type 5)
   */
  private static generateReelConfigXML(gameCode: string, sessionId: string): string {
    // Basic reel configuration for Aztec Gold Megaways
    const symbols = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'WILD', 'SCATTER'];

    const generateReelStrip = (reelNum: number) => {
      // Generate a simple reel strip
      const strip: string[] = [];
      for (let i = 0; i < 20; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        strip.push(symbol);
      }
      return strip.join(',');
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<reels>
  <reel id="1">${generateReelStrip(1)}</reel>
  <reel id="2">${generateReelStrip(2)}</reel>
  <reel id="3">${generateReelStrip(3)}</reel>
  <reel id="4">${generateReelStrip(4)}</reel>
  <reel id="5">${generateReelStrip(5)}</reel>
  <reel id="6">${generateReelStrip(6)}</reel>
</reels>`;
  }

  /**
   * Generate paytable configuration XML (Type 7)
   */
  private static generatePaytableConfigXML(gameCode: string, sessionId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<paytable>
  <symbol id="H1" name="High1">
    <payout count="3">5</payout>
    <payout count="4">20</payout>
    <payout count="5">50</payout>
    <payout count="6">200</payout>
  </symbol>
  <symbol id="H2" name="High2">
    <payout count="3">4</payout>
    <payout count="4">15</payout>
    <payout count="5">40</payout>
    <payout count="6">150</payout>
  </symbol>
  <symbol id="H3" name="High3">
    <payout count="3">3</payout>
    <payout count="4">10</payout>
    <payout count="5">30</payout>
    <payout count="6">100</payout>
  </symbol>
  <symbol id="H4" name="High4">
    <payout count="3">2</payout>
    <payout count="4">8</payout>
    <payout count="5">25</payout>
    <payout count="6">80</payout>
  </symbol>
  <symbol id="L1" name="Low1">
    <payout count="3">1</payout>
    <payout count="4">5</payout>
    <payout count="5">15</payout>
    <payout count="6">50</payout>
  </symbol>
  <symbol id="L2" name="Low2">
    <payout count="3">1</payout>
    <payout count="4">5</payout>
    <payout count="5">15</payout>
    <payout count="6">50</payout>
  </symbol>
  <symbol id="L3" name="Low3">
    <payout count="3">1</payout>
    <payout count="4">4</payout>
    <payout count="5">12</payout>
    <payout count="6">40</payout>
  </symbol>
  <symbol id="L4" name="Low4">
    <payout count="3">1</payout>
    <payout count="4">4</payout>
    <payout count="5">12</payout>
    <payout count="6">40</payout>
  </symbol>
  <symbol id="WILD" name="Wild">
    <substitute>true</substitute>
    <payout count="3">0</payout>
    <payout count="4">0</payout>
    <payout count="5">0</payout>
    <payout count="6">0</payout>
  </symbol>
  <symbol id="SCATTER" name="Scatter">
    <trigger>freespins</trigger>
    <payout count="3">100</payout>
    <payout count="4">500</payout>
    <payout count="5">2000</payout>
    <payout count="6">10000</payout>
  </symbol>
</paytable>`;
  }
}
