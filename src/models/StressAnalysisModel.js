import Tesseract from 'tesseract.js';

export class StressAnalysisModel {
    constructor() {
        this.API_URL = 'https://web-production-1151.up.railway.app/predict';
        this.tesseractWorker = null;
        this.ocrConfig = {
            lang: 'ind',
            whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?:;()[]{}"\'-/@#$%^&*+=<>|\\~ ',
            psm: Tesseract.PSM.AUTO,
            logger: m => console.debug('Tesseract:', m)
        };
    }

    /**
     * Main analysis pipeline
     * @param {File} file - Image file containing chat text
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeStress(file) {
        const startTime = performance.now();
        
        try {
            // Validate input
            if (!file || !(file instanceof File)) {
                throw new Error('Invalid file input');
            }

            // OCR Processing
            const extractedText = await this.extractTextFromImage(file);
            const cleanText = this.cleanExtractedText(extractedText);
            
            if (cleanText.split(' ').length < 3) {
                throw new Error('Teks terlalu pendek untuk analisis');
            }

            // Stress Analysis
            const apiResponse = await this.sendToStressAPI(cleanText);
            
            // Format comprehensive result
            const result = this.formatResult(apiResponse, cleanText);
            
            console.log(`Analysis completed in ${((performance.now() - startTime)/1000).toFixed(2)}s`);
            return result;

        } catch (error) {
            console.error('Analysis pipeline error:', error);
            throw this.handleAnalysisError(error);
        }
    }

    /**
     * Extract text from image using OCR
     * @param {File} file - Image file
     * @returns {Promise<string>} Extracted text
     */
async extractTextFromImage(file) {
    try {
        if (!this.tesseractWorker) {
            this.tesseractWorker = Tesseract.createWorker({
                logger: this.ocrConfig.logger
            });
            await this.tesseractWorker.load();
            await this.tesseractWorker.loadLanguage(this.ocrConfig.lang);
            await this.tesseractWorker.initialize(this.ocrConfig.lang);
            await this.tesseractWorker.setParameters({
                tessedit_char_whitelist: this.ocrConfig.whitelist,
                tessedit_pageseg_mode: this.ocrConfig.psm
            });
        }
        const { data: { text } } = await this.tesseractWorker.recognize(file);
        return text;
    } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Gagal membaca teks dari gambar. Pastikan: \n1. Gambar jelas\n2. Teks terbaca\n3. Format didukung');
    }
}

    /**
     * Clean and normalize OCR output
     * @param {string} text - Raw OCR output
     * @returns {string} Cleaned text
     */
    cleanExtractedText(text) {
        if (!text) return '';
        
        return text
            .replace(/\s+/g, ' ')
            .replace(/[|_\-~]+/g, ' ')
            .replace(/([.,!?:;])\1+/g, '$1')
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 2 && 
                       !/^[\W\d_]+$/.test(trimmed);
            })
            .join(' ')
            .trim();
    }

    /**
     * Send text to stress detection API
     * @param {string} text - Text to analyze
     * @returns {Promise<Object>} API response
     */
async sendToStressAPI(text) {
    try {
        const response = await fetch(this.API_URL, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.substring(0, 1000) }) 
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error dari server analisis');
        }

        return await response.json();

    } catch (error) {
        console.error('API Communication Error:', error);
        throw new Error('Gagal menghubungi server analisis. Coba beberapa saat lagi.');
    }
}

    /**
     * Format raw API response
     * @param {Object} apiResult 
     * @param {string} originalText
     * @returns {Object}
     */
    formatResult(apiResult, originalText) {
        const stressLevel = Math.min(100, Math.max(0, apiResult.stress_percent || 0));
        const isStressed = apiResult.prediction === "Negative";

        return {
            stress_level: stressLevel,
            category: this.getStressCategory(stressLevel),
            prediction: apiResult.prediction,
            stress_words: this.extractStressKeywords(originalText),
            sentiment: isStressed ? 'Negatif' : 'Positif/Netral',
            recommendation: this.generateRecommendation(stressLevel),
            confidence: this.calculateConfidence(stressLevel),
            analysis_details: {
                key_phrases: this.extractKeyPhrases(originalText),
                word_count: originalText.split(/\s+/).length,
                readability: this.assessReadability(originalText)
            }
        };
    }

    // Helper methods
    getStressCategory(percentage) {
        const categories = [
            { threshold: 80, label: 'Sangat Tinggi', emoji: '🔥' },
            { threshold: 60, label: 'Tinggi', emoji: '⚠️' },
            { threshold: 40, label: 'Sedang', emoji: '😐' },
            { threshold: 20, label: 'Rendah', emoji: '😊' },
            { threshold: 0, label: 'Minimal', emoji: '😌' }
        ];
        
        return categories.find(c => percentage >= c.threshold) || categories[categories.length-1];
    }

    extractStressKeywords(text) {
        const stressLexicon = [
            'stress', 'stres', 'tertekan', 'frustasi', 'panik', 
            'cemas', 'khawatir', 'gelisah', 'sedih', 'kecewa',
            'capek', 'lelah', 'penat', 'pusing', 'sakit kepala',
            'deadline', 'tumpuk', 'numpuk', 'beban kerja', 'target',
            'gabut', 'bete', 'drama', 'risih', 'jengkel'
        ];

    return [...new Set(
            text.toLowerCase().split(/\s+/)
            .filter(word => stressLexicon.some(keyword => word.includes(keyword)))
            )].slice(0, 5);
    }

    generateRecommendation(percentage) {
        const recommendations = {
            high: [
                "Pertimbangkan konsultasi dengan profesional kesehatan mental",
                "Lakukan teknik grounding: fokus pada pernapasan dan lingkungan sekitar",
                "Batasi paparan terhadap sumber stres jika memungkinkan"
            ],
            medium: [
                "Lakukan aktivitas fisik ringan seperti jalan kaki",
                "Prakirakan teknik manajemen waktu seperti Pomodoro",
                "Diskusikan perasaan dengan orang terpercaya"
            ],
            low: [
                "Pertahankan rutinitas yang sehat dan seimbang",
                "Lakukan hobi atau aktivitas menyenangkan",
                "Latih mindfulness atau meditasi singkat"
            ]
        };

        const category = percentage >= 60 ? 'high' : 
                        percentage >= 30 ? 'medium' : 'low';
        
        return recommendations[category][
            Math.floor(Math.random() * recommendations[category].length)
        ];
    }

    calculateConfidence(stressLevel) {
        // Simple confidence calculation based on stress level
        if (stressLevel >= 80 || stressLevel <= 20) {
            return Math.min(95, 85 + Math.random() * 10);
        } else if (stressLevel >= 60 || stressLevel <= 40) {
            return Math.min(85, 75 + Math.random() * 10);
        } else {
            return Math.min(75, 65 + Math.random() * 10);
        }
    }

    extractKeyPhrases(text) {
        // Simple key phrase extraction
        const words = text.toLowerCase().split(/\s+/);
        const phrases = [];
        
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i].length > 3 && words[i + 1].length > 3) {
                phrases.push(`${words[i]} ${words[i + 1]}`);
            }
        }
        
        return phrases.slice(0, 3);
    }

    assessReadability(text) {
        const avgWordsPerSentence = text.split(/[.!?]+/).filter(s => s.trim()).length;
        const avgCharsPerWord = text.replace(/\s+/g, '').length / text.split(/\s+/).length;
        
        if (avgWordsPerSentence < 10 && avgCharsPerWord < 6) {
            return 'Mudah dibaca';
        } else if (avgWordsPerSentence < 20 && avgCharsPerWord < 8) {
            return 'Sedang';
        } else {
            return 'Sulit dibaca';
        }
    }

    // Error handling
    handleAPIError(status, errorData) {
        const errors = {
            400: 'Teks tidak valid untuk analisis',
            413: 'Teks terlalu panjang',
            429: 'Terlalu banyak permintaan. Coba lagi nanti',
            500: 'Kesalahan server internal',
            503: 'Layanan tidak tersedia sementara'
        };

        return new Error(
            errorData.message || 
            errors[status] || 
            `Kesalahan server (${status})`
        );
    }

    handleAnalysisError(error) {
        const userFriendlyMessages = {
            'NetworkError': 'Koneksi internet bermasalah',
            'SyntaxError': 'Respons server tidak valid',
            'TypeError': 'Operasi tidak didukung'
        };

        return new Error(
            userFriendlyMessages[error.name] ||
            error.message ||
            'Terjadi kesalahan selama analisis'
        );
    }

    // Cleanup
    async cleanup() {
        if (this.tesseractWorker) {
            await this.tesseractWorker.terminate();
            this.tesseractWorker = null;
        }
    }
}