import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ParameterMerger } from '../../src/parameter-merger.js';

describe('ParameterMerger', () => {
    let parameterMerger;

    beforeEach(() => {
        parameterMerger = new ParameterMerger();
    });

    describe('mergeParameters', () => {
        it('should merge default and environment parameters with environment taking precedence', () => {
            const defaultParams = {
                param1: 'default1',
                param2: 'default2',
                param3: 'default3'
            };

            const envParams = {
                param2: 'env2',
                param4: 'env4'
            };

            const result = parameterMerger.mergeParameters(defaultParams, envParams);

            expect(result).toEqual({
                param1: 'default1',
                param2: 'env2', // Environment value overrides default
                param3: 'default3',
                param4: 'env4'  // New environment parameter added
            });
        });

        it('should return only default parameters when environment parameters are null', () => {
            const defaultParams = {
                param1: 'default1',
                param2: 'default2'
            };

            const result = parameterMerger.mergeParameters(defaultParams, null);

            expect(result).toEqual({
                param1: 'default1',
                param2: 'default2'
            });
        });

        it('should return only default parameters when environment parameters are undefined', () => {
            const defaultParams = {
                param1: 'default1',
                param2: 'default2'
            };

            const result = parameterMerger.mergeParameters(defaultParams, undefined);

            expect(result).toEqual({
                param1: 'default1',
                param2: 'default2'
            });
        });

        it('should handle empty environment parameters object', () => {
            const defaultParams = {
                param1: 'default1',
                param2: 'default2'
            };

            const result = parameterMerger.mergeParameters(defaultParams, {});

            expect(result).toEqual({
                param1: 'default1',
                param2: 'default2'
            });
        });

        it('should handle empty default parameters object', () => {
            const envParams = {
                param1: 'env1',
                param2: 'env2'
            };

            const result = parameterMerger.mergeParameters({}, envParams);

            expect(result).toEqual({
                param1: 'env1',
                param2: 'env2'
            });
        });

        it('should throw error when default parameters is null', () => {
            expect(() => {
                parameterMerger.mergeParameters(null, { param1: 'value1' });
            }).toThrow('Default parameters must be a valid object');
        });

        it('should throw error when default parameters is undefined', () => {
            expect(() => {
                parameterMerger.mergeParameters(undefined, { param1: 'value1' });
            }).toThrow('Default parameters must be a valid object');
        });

        it('should throw error when default parameters is not an object', () => {
            expect(() => {
                parameterMerger.mergeParameters('not an object', { param1: 'value1' });
            }).toThrow('Default parameters must be a valid object');
        });

        it('should not mutate original parameter objects', () => {
            const defaultParams = { param1: 'default1' };
            const envParams = { param2: 'env2' };
            const originalDefault = { ...defaultParams };
            const originalEnv = { ...envParams };

            parameterMerger.mergeParameters(defaultParams, envParams);

            expect(defaultParams).toEqual(originalDefault);
            expect(envParams).toEqual(originalEnv);
        });
    });

    describe('formatForCloudFormation', () => {
        it('should format parameters for CloudFormation deployment', () => {
            const mergedParams = {
                VpcId: 'vpc-12345',
                InstanceType: 't3.micro',
                Environment: 'development'
            };

            const result = parameterMerger.formatForCloudFormation(mergedParams);

            expect(result).toEqual([
                { ParameterName: 'VpcId', ParameterValue: 'vpc-12345' },
                { ParameterName: 'InstanceType', ParameterValue: 't3.micro' },
                { ParameterName: 'Environment', ParameterValue: 'development' }
            ]);
        });

        it('should convert non-string values to strings', () => {
            const mergedParams = {
                Port: 8080,
                Enabled: true,
                Count: 0,
                Ratio: 1.5
            };

            const result = parameterMerger.formatForCloudFormation(mergedParams);

            expect(result).toEqual([
                { ParameterName: 'Port', ParameterValue: '8080' },
                { ParameterName: 'Enabled', ParameterValue: 'true' },
                { ParameterName: 'Count', ParameterValue: '0' },
                { ParameterName: 'Ratio', ParameterValue: '1.5' }
            ]);
        });

        it('should handle empty parameters object', () => {
            const result = parameterMerger.formatForCloudFormation({});

            expect(result).toEqual([]);
        });

        it('should throw error when merged parameters is null', () => {
            expect(() => {
                parameterMerger.formatForCloudFormation(null);
            }).toThrow('Merged parameters must be a valid object');
        });

        it('should throw error when merged parameters is undefined', () => {
            expect(() => {
                parameterMerger.formatForCloudFormation(undefined);
            }).toThrow('Merged parameters must be a valid object');
        });

        it('should throw error when merged parameters is not an object', () => {
            expect(() => {
                parameterMerger.formatForCloudFormation('not an object');
            }).toThrow('Merged parameters must be a valid object (not an array)');
        });

        it('should throw error when merged parameters is an array', () => {
            expect(() => {
                parameterMerger.formatForCloudFormation(['not', 'an', 'object']);
            }).toThrow('Merged parameters must be a valid object (not an array)');
        });

        it('should handle object and array parameter values', () => {
            const mergedParams = {
                ObjectParam: { nested: { value: 'test' } },
                ArrayParam: ['item1', 'item2', 'item3'],
                StringParam: 'simple-string'
            };

            const result = parameterMerger.formatForCloudFormation(mergedParams);

            expect(result).toEqual([
                { ParameterName: 'ObjectParam', ParameterValue: '{"nested":{"value":"test"}}' },
                { ParameterName: 'ArrayParam', ParameterValue: '["item1","item2","item3"]' },
                { ParameterName: 'StringParam', ParameterValue: 'simple-string' }
            ]);
        });

        it('should throw error for null or undefined parameter values', () => {
            const mergedParams = {
                ValidParam: 'valid-value',
                NullParam: null
            };

            expect(() => parameterMerger.formatForCloudFormation(mergedParams))
                .toThrow("Parameter 'NullParam' has null or undefined value");
        });

        it('should throw error for empty parameter names', () => {
            const mergedParams = {
                '': 'empty-key-value',
                'ValidParam': 'valid-value'
            };

            expect(() => parameterMerger.formatForCloudFormation(mergedParams))
                .toThrow('Invalid parameter name');
        });

        it('should handle formatting errors gracefully', () => {
            const mergedParams = { param1: 'value1' };
            
            // Mock validateParameterObject to throw an error
            const originalValidate = parameterMerger.validateParameterObject;
            parameterMerger.validateParameterObject = vi.fn().mockImplementation(() => {
                throw new Error('Validation failed');
            });
            
            expect(() => parameterMerger.formatForCloudFormation(mergedParams))
                .toThrow('Failed to format parameters for CloudFormation: Validation failed');
            
            // Restore original method
            parameterMerger.validateParameterObject = originalValidate;
        });

        it('should handle parameters with special characters in values', () => {
            const mergedParams = {
                Password: 'P@ssw0rd!',
                Description: 'A test with spaces and symbols: #$%'
            };

            const result = parameterMerger.formatForCloudFormation(mergedParams);

            expect(result).toEqual([
                { ParameterName: 'Password', ParameterValue: 'P@ssw0rd!' },
                { ParameterName: 'Description', ParameterValue: 'A test with spaces and symbols: #$%' }
            ]);
        });
    });

    describe('validateParameterObject', () => {
        it('should pass validation for valid parameter objects', () => {
            const validParams = {
                ValidParam1: 'value1',
                ValidParam2: 'value2',
                ValidParam123: 'value3'
            };

            expect(() => parameterMerger.validateParameterObject(validParams, 'test'))
                .not.toThrow();
        });

        it('should throw error for invalid parameter object types', () => {
            expect(() => parameterMerger.validateParameterObject(null, 'test'))
                .toThrow('test parameters must be a valid object');
            
            expect(() => parameterMerger.validateParameterObject([], 'test'))
                .toThrow('test parameters must be a valid object');
            
            expect(() => parameterMerger.validateParameterObject('string', 'test'))
                .toThrow('test parameters must be a valid object');
        });

        it('should throw error for too many parameters', () => {
            const tooManyParams = {};
            for (let i = 0; i < 201; i++) {
                tooManyParams[`Param${i}`] = `value${i}`;
            }

            expect(() => parameterMerger.validateParameterObject(tooManyParams, 'test'))
                .toThrow('Too many test parameters (201). Maximum supported is 200 parameters.');
        });

        it('should throw error for invalid parameter names', () => {
            const invalidParams = {
                '': 'empty-name',
                'ValidParam': 'valid-value'
            };

            expect(() => parameterMerger.validateParameterObject(invalidParams, 'test'))
                .toThrow("Invalid test parameter name: ''. Parameter names must be non-empty strings.");
        });

        it('should throw error for parameter names that are too long', () => {
            const longName = 'a'.repeat(256);
            const invalidParams = {
                [longName]: 'value',
                'ValidParam': 'valid-value'
            };

            expect(() => parameterMerger.validateParameterObject(invalidParams, 'test'))
                .toThrow(`test parameter name '${longName}' is too long (256 characters). Maximum length is 255 characters.`);
        });

        it('should throw error for invalid parameter name characters', () => {
            const invalidParams = {
                '123InvalidStart': 'value1',
                'ValidParam': 'valid-value'
            };

            expect(() => parameterMerger.validateParameterObject(invalidParams, 'test'))
                .toThrow("test parameter name '123InvalidStart' contains invalid characters");
        });

        it('should throw error for parameter names with special characters', () => {
            const invalidParams = {
                'Invalid-Name': 'value1',
                'ValidParam': 'valid-value'
            };

            expect(() => parameterMerger.validateParameterObject(invalidParams, 'test'))
                .toThrow("test parameter name 'Invalid-Name' contains invalid characters");
        });

        it('should throw error for null or undefined parameter values', () => {
            const invalidParams = {
                'ValidParam': 'valid-value',
                'NullParam': null
            };

            expect(() => parameterMerger.validateParameterObject(invalidParams, 'test'))
                .toThrow("test parameter 'NullParam' has null or undefined value");
        });

        it('should throw error for parameter values that are too long', () => {
            const longValue = 'a'.repeat(4097);
            const invalidParams = {
                'ValidParam': 'valid-value',
                'LongParam': longValue
            };

            expect(() => parameterMerger.validateParameterObject(invalidParams, 'test'))
                .toThrow("test parameter 'LongParam' value is too long (4097 characters). Maximum length is 4096 characters.");
        });

        it('should handle object values correctly', () => {
            const paramsWithObjects = {
                'ObjectParam': { nested: 'value' },
                'ValidParam': 'valid-value'
            };

            expect(() => parameterMerger.validateParameterObject(paramsWithObjects, 'test'))
                .not.toThrow();
        });

        it('should accept valid parameter names', () => {
            const validParams = {
                'ValidParam': 'value1',
                'AnotherValidParam': 'value2',
                'Param123': 'value3',
                'UPPERCASE': 'value4',
                'lowercase': 'value5',
                'MixedCase': 'value6'
            };

            expect(() => parameterMerger.validateParameterObject(validParams, 'test'))
                .not.toThrow();
        });
    });

    describe('integration scenarios', () => {
        it('should handle complete merge and format workflow', () => {
            const defaultParams = {
                VpcId: 'vpc-default',
                InstanceType: 't3.micro',
                Environment: 'default'
            };

            const envParams = {
                VpcId: 'vpc-prod-123',
                Environment: 'production',
                BackupRetention: 30
            };

            // Merge parameters
            const merged = parameterMerger.mergeParameters(defaultParams, envParams);

            // Format for CloudFormation
            const formatted = parameterMerger.formatForCloudFormation(merged);

            expect(formatted).toEqual([
                { ParameterName: 'VpcId', ParameterValue: 'vpc-prod-123' },
                { ParameterName: 'InstanceType', ParameterValue: 't3.micro' },
                { ParameterName: 'Environment', ParameterValue: 'production' },
                { ParameterName: 'BackupRetention', ParameterValue: '30' }
            ]);
        });

        it('should handle workflow with missing environment parameters', () => {
            const defaultParams = {
                VpcId: 'vpc-default',
                InstanceType: 't3.micro'
            };

            // Merge with null environment parameters
            const merged = parameterMerger.mergeParameters(defaultParams, null);

            // Format for CloudFormation
            const formatted = parameterMerger.formatForCloudFormation(merged);

            expect(formatted).toEqual([
                { ParameterName: 'VpcId', ParameterValue: 'vpc-default' },
                { ParameterName: 'InstanceType', ParameterValue: 't3.micro' }
            ]);
        });
    });
});